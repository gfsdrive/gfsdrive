import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CalendarClock,
  CarFront,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  HeartHandshake,
  MessageCircle,
  UserCheck,
} from 'lucide-react';
import { PRECOS } from '../config/precos';
import { buildWhatsAppLink } from '../config/site';
import { useSimulator } from '../context/SimulatorContext';
import { SupportedLang } from '../i18n';
import {
  CalculoResultado,
  SERVICOS,
  ServiceDefinition,
  ServiceId,
  calcularPreco,
  formatarDataHoraPorIdioma,
  formatarHoraPorIdioma,
  formatarMoeda,
  isEnderecoBaseConfigurado,
  timeStringToMinutes,
} from '../lib/calcularPreco';
import {
  montarMensagemFallbackSemCalculo,
  montarMensagemWhatsApp,
  registrarEEnviarAgendamento,
} from '../services/bookingService';
import { isQuotaError } from '../hooks/useAutocompleteSuggestions';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { AnimatedCurrency } from './AnimatedCounter';
import { Reveal } from './Reveal';
import { RoutePreviewMap } from './RoutePreviewMap';

export interface SimulatorInitialState {
  servicoId?: ServiceId;
  agendandoParaOutraPessoa?: boolean;
  startAtStep?: number;
  nonce?: number;
}

interface SimulatorWizardProps {
  mapsAvailable: boolean;
  variant?: 'inline' | 'drawer';
  origemFluxo?: 'site' | 'melhor_idade' | 'qr';
  qrBanner?: boolean;
}

interface PresetPlace {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function estimateHaversineKm(
  a?: { lat: number; lng: number },
  b?: { lat: number; lng: number }
): number | null {
  if (!a || !b) return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const straightKm = 2 * R * Math.asin(Math.sqrt(h));
  return Math.max(2, Math.round(straightKm * 1.3 * 10) / 10);
}

function addHoursToTime(timeStr: string, hoursToAdd: number): string {
  const totalMin = timeStringToMinutes(timeStr) + Math.round(hoursToAdd * 60);
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const mm = String(wrapped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getServiceIcon(id: ServiceId) {
  switch (id) {
    case 'transporte_agendado':
      return CarFront;
    case 'compromisso':
      return CalendarClock;
    case 'melhor_idade':
      return HeartHandshake;
    case 'corporativo':
      return Briefcase;
    case 'passeios_viagens':
      return Compass;
  }
}

interface RouteComputeTriggerProps {
  requestKey: number;
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
  needsRoundTrip: boolean;
  onResult: (data: {
    oneWayKm: number;
    roundTripKm: number;
    displacementKm: number;
    oneWayDurationMin: number;
  }) => void;
  onError: () => void;
}

const MapsRouteCalculatorBridge: React.FC<RouteComputeTriggerProps> = ({
  requestKey,
  origin,
  destination,
  needsRoundTrip,
  onResult,
  onError,
}) => {
  const routesLib = useMapsLibrary('routes');
  const lastHandledKeyRef = useRef<number>(0);

  useEffect(() => {
    if (requestKey === 0 || requestKey === lastHandledKeyRef.current) return;
    if (!routesLib) return;

    lastHandledKeyRef.current = requestKey;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        onError();
      }
    }, 10000);

    const compute = async () => {
      try {
        const oneWayRes = await (routesLib.Route as any).computeRoutes({
          origin,
          destination,
          travelMode: 'DRIVING',
          fields: ['distanceMeters', 'durationMillis'],
        });

        const firstRoute = oneWayRes?.routes?.[0];
        if (!firstRoute || typeof firstRoute.distanceMeters !== 'number') {
          if (!cancelled) {
            window.clearTimeout(timeoutId);
            onError();
          }
          return;
        }

        const oneWayKm = Math.max(0.5, Number((firstRoute.distanceMeters / 1000).toFixed(1)));
        const oneWayDurationMin = Math.max(
          5,
          Math.round((firstRoute.durationMillis ?? oneWayKm * 120000) / 60000)
        );

        let roundTripKm = oneWayKm * 2;
        if (needsRoundTrip) {
          try {
            const returnRes = await (routesLib.Route as any).computeRoutes({
              origin: destination,
              destination: origin,
              travelMode: 'DRIVING',
              fields: ['distanceMeters'],
            });
            const returnMeters = returnRes?.routes?.[0]?.distanceMeters;
            if (typeof returnMeters === 'number') {
              roundTripKm = Number((oneWayKm + returnMeters / 1000).toFixed(1));
            }
          } catch {
            // Mantém estimativa de ida e volta 2x
          }
        }

        let displacementKm = 0;
        if (isEnderecoBaseConfigurado()) {
          try {
            const dispRes = await (routesLib.Route as any).computeRoutes({
              origin: PRECOS.deslocamento.enderecoBase,
              destination: origin,
              travelMode: 'DRIVING',
              fields: ['distanceMeters'],
            });
            const dispMeters = dispRes?.routes?.[0]?.distanceMeters;
            if (typeof dispMeters === 'number') {
              displacementKm = Number((dispMeters / 1000).toFixed(1));
            }
          } catch {
            displacementKm = 0;
          }
        }

        if (!cancelled) {
          window.clearTimeout(timeoutId);
          onResult({ oneWayKm, roundTripKm, displacementKm, oneWayDurationMin });
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) {
          window.clearTimeout(timeoutId);
          onError();
        }
      }
    };

    void compute();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [requestKey, routesLib, origin, destination, needsRoundTrip, onResult, onError]);

  return null;
};

export const SimulatorWizard: React.FC<SimulatorWizardProps> = ({
  mapsAvailable,
  variant = 'inline',
  origemFluxo = 'site',
  qrBanner = false,
}) => {
  const { t, i18n } = useTranslation();
  const lang: SupportedLang = i18n.language === 'en' ? 'en' : 'pt-BR';
  const prefersReduced = useReducedMotion();
  const isDrawer = variant === 'drawer';

  const {
    step,
    setStep,
    servicoId,
    setServicoId,
    origem,
    setOrigem,
    origemLatLng,
    setOrigemLatLng,
    destino,
    setDestino,
    destinoLatLng,
    setDestinoLatLng,
    dataSaida,
    setDataSaida,
    horaSaida,
    setHoraSaida,
    horaRetorno,
    setHoraRetorno,
    retornoOutroDia,
    setRetornoOutroDia,
    distanciaManualKm,
    setDistanciaManualKm,
    distanciaTrechoKm,
    setDistanciaTrechoKm,
    distanciaIdaVoltaKm,
    setDistanciaIdaVoltaKm,
    deslocamentoKm,
    setDeslocamentoKm,
    duracaoDeslocamentoMin,
    setDuracaoDeslocamentoMin,
    calculandoRota,
    setCalculandoRota,
    erroRotaMaps,
    setErroRotaMaps,
    routeRequestKey,
    setRouteRequestKey,
    mostrarDetalhamento,
    setMostrarDetalhamento,
    calculo,
    setCalculo,
    firstCalculatedKey,
    markFirstCalculated,
    nomeCliente,
    setNomeCliente,
    telefoneCliente,
    setTelefoneCliente,
    agendandoParaOutraPessoa,
    setAgendandoParaOutraPessoa,
    nomePassageiro,
    setNomePassageiro,
    telefonePassageiro,
    setTelefonePassageiro,
    observacoes,
    setObservacoes,
    stepErrorKey,
    setStepErrorKey,
    formErrorKeys,
    setFormErrorKeys,
    enviadoResumo,
    setEnviadoResumo,
    isDrawerOpen,
  } = useSimulator();

  const [copiadoSucesso, setCopiadoSucesso] = useState<boolean>(false);
  const [mobileTicketExpanded, setMobileTicketExpanded] = useState<boolean>(false);

  const dateInputId = useId();
  const timeOutId = useId();
  const timeReturnId = useId();
  const demoKmId = useId();
  const nomeId = useId();
  const telefoneId = useId();
  const passageiroNomeId = useId();
  const passageiroTelId = useId();
  const obsId = useId();

  const lastRequestedSigRef = useRef<string>('');
  const clientNameInputRef = useRef<HTMLInputElement | null>(null);

  const servicoAtual: ServiceDefinition =
    SERVICOS.find((s) => s.id === servicoId) ?? SERVICOS[0];

  const presetsOrigin = t('simulator.presetsOrigin', { returnObjects: true }) as PresetPlace[];
  const presetsDestination = t('simulator.presetsDestination', {
    returnObjects: true,
  }) as PresetPlace[];
  const quickNotes = t('simulator.quickNotes', { returnObjects: true }) as string[];

  const hasValidRouteText = origem.trim().length >= 3 && destino.trim().length >= 3;

  // Atualiza distância sugerida no modo sem Maps quando escolhe sugestões rápidas
  useEffect(() => {
    if (mapsAvailable) return;
    const est = estimateHaversineKm(origemLatLng, destinoLatLng);
    if (est !== null) {
      setDistanciaManualKm(String(est));
    }
  }, [mapsAvailable, origemLatLng, destinoLatLng, setDistanciaManualKm]);

  // Solicita rota real ao Google Maps quando origem e destino são válidos no passo >= 3 (ou ao selecionar sugestões com coordenadas)
  const triggerMapsCalculationIfNeeded = useCallback(
    (force = false) => {
      if (!mapsAvailable || !hasValidRouteText) return;
      if (retornoOutroDia && servicoAtual.temRetorno) return;

      const sig = `${origemLatLng ? `${origemLatLng.lat},${origemLatLng.lng}` : origem.trim()}|${
        destinoLatLng ? `${destinoLatLng.lat},${destinoLatLng.lng}` : destino.trim()
      }|${servicoAtual.idaEVolta ? 'rt' : 'ow'}`;

      if (!force && sig === lastRequestedSigRef.current) return;
      lastRequestedSigRef.current = sig;
      setCalculandoRota(true);
      setErroRotaMaps(false);
      setRouteRequestKey((k) => k + 1);
    },
    [
      mapsAvailable,
      hasValidRouteText,
      retornoOutroDia,
      servicoAtual.temRetorno,
      servicoAtual.idaEVolta,
      origemLatLng,
      destinoLatLng,
      origem,
      destino,
      setCalculandoRota,
      setErroRotaMaps,
      setRouteRequestKey,
    ]
  );

  // Recalcula automaticamente quando entra no passo 3 ou 4 com trajeto preenchido (ex: vindo do mini-simulador)
  useEffect(() => {
    if (!mapsAvailable || !hasValidRouteText) return;
    if (step >= 3 || (origemLatLng && destinoLatLng)) {
      triggerMapsCalculationIfNeeded(false);
    }
  }, [mapsAvailable, hasValidRouteText, step, origemLatLng, destinoLatLng, triggerMapsCalculationIfNeeded]);

  // Recalcula tarifa em tempo real sempre que serviço, data/hora ou distância disponível mudarem
  useEffect(() => {
    if (retornoOutroDia && servicoAtual.temRetorno) {
      const res = calcularPreco({
        servicoId,
        distanciaTrechoKm: 0,
        distanciaIdaVoltaKm: 0,
        deslocamentoKm: 0,
        dataSaida,
        horaSaida,
        horaRetorno,
        retornoOutroDia: true,
        aplicarMargemPasseio: true,
      });
      setCalculo(res);
      return;
    }

    if (!hasValidRouteText || !dataSaida || !horaSaida) {
      setCalculo(null);
      return;
    }

    if (!mapsAvailable) {
      const kmNum = Math.max(0.5, Number(distanciaManualKm.replace(',', '.')) || 12);
      const minEst = Math.max(10, Math.round(kmNum * 2.1));
      setDistanciaTrechoKm(kmNum);
      setDistanciaIdaVoltaKm(kmNum * 2);
      setDeslocamentoKm(0);
      setDuracaoDeslocamentoMin(minEst);

      const res = calcularPreco({
        servicoId,
        distanciaTrechoKm: kmNum,
        distanciaIdaVoltaKm: servicoAtual.idaEVolta ? kmNum * 2 : undefined,
        deslocamentoKm: 0,
        dataSaida,
        horaSaida,
        horaRetorno: servicoAtual.temRetorno ? horaRetorno : undefined,
        retornoOutroDia: false,
        duracaoDeslocamentoMin: minEst,
        aplicarMargemPasseio: true,
      });
      setCalculo(res);
      if (res.sucesso) markFirstCalculated();
      return;
    }

    // Com Google Maps: usa distância real calculada se já retornou, senão estimativa Haversine enquanto rota não chega
    if (distanciaTrechoKm > 0 && !calculandoRota && !erroRotaMaps) {
      const res = calcularPreco({
        servicoId,
        distanciaTrechoKm,
        distanciaIdaVoltaKm: servicoAtual.idaEVolta ? distanciaIdaVoltaKm : undefined,
        deslocamentoKm,
        dataSaida,
        horaSaida,
        horaRetorno: servicoAtual.temRetorno ? horaRetorno : undefined,
        retornoOutroDia: false,
        duracaoDeslocamentoMin,
        aplicarMargemPasseio: true,
      });
      setCalculo(res);
      if (res.sucesso) markFirstCalculated();
    } else if (origemLatLng && destinoLatLng && !calculandoRota) {
      const est = estimateHaversineKm(origemLatLng, destinoLatLng);
      if (est) {
        const minEst = Math.max(10, Math.round(est * 2.1));
        const res = calcularPreco({
          servicoId,
          distanciaTrechoKm: est,
          distanciaIdaVoltaKm: servicoAtual.idaEVolta ? est * 2 : undefined,
          deslocamentoKm,
          dataSaida,
          horaSaida,
          horaRetorno: servicoAtual.temRetorno ? horaRetorno : undefined,
          retornoOutroDia: false,
          duracaoDeslocamentoMin: minEst,
          aplicarMargemPasseio: true,
        });
        setCalculo(res);
        if (res.sucesso) markFirstCalculated();
      }
    }
  }, [
    mapsAvailable,
    hasValidRouteText,
    servicoId,
    servicoAtual.idaEVolta,
    servicoAtual.temRetorno,
    distanciaManualKm,
    distanciaTrechoKm,
    distanciaIdaVoltaKm,
    deslocamentoKm,
    duracaoDeslocamentoMin,
    dataSaida,
    horaSaida,
    horaRetorno,
    retornoOutroDia,
    origemLatLng,
    destinoLatLng,
    calculandoRota,
    erroRotaMaps,
    setCalculo,
    setDistanciaTrechoKm,
    setDistanciaIdaVoltaKm,
    setDeslocamentoKm,
    setDuracaoDeslocamentoMin,
    markFirstCalculated,
  ]);

  const handleMapsRouteResult = useCallback(
    (data: {
      oneWayKm: number;
      roundTripKm: number;
      displacementKm: number;
      oneWayDurationMin: number;
    }) => {
      setCalculandoRota(false);
      setErroRotaMaps(false);
      setDistanciaTrechoKm(data.oneWayKm);
      setDistanciaIdaVoltaKm(data.roundTripKm);
      setDeslocamentoKm(data.displacementKm);
      setDuracaoDeslocamentoMin(data.oneWayDurationMin);

      const res = calcularPreco({
        servicoId,
        distanciaTrechoKm: data.oneWayKm,
        distanciaIdaVoltaKm: servicoAtual.idaEVolta ? data.roundTripKm : undefined,
        deslocamentoKm: data.displacementKm,
        dataSaida,
        horaSaida,
        horaRetorno: servicoAtual.temRetorno ? horaRetorno : undefined,
        retornoOutroDia: servicoAtual.temRetorno ? retornoOutroDia : false,
        duracaoDeslocamentoMin: data.oneWayDurationMin,
        aplicarMargemPasseio: true,
      });
      setCalculo(res);
      if (res.sucesso) markFirstCalculated();
    },
    [
      servicoId,
      servicoAtual.idaEVolta,
      servicoAtual.temRetorno,
      dataSaida,
      horaSaida,
      horaRetorno,
      retornoOutroDia,
      setCalculandoRota,
      setErroRotaMaps,
      setDistanciaTrechoKm,
      setDistanciaIdaVoltaKm,
      setDeslocamentoKm,
      setDuracaoDeslocamentoMin,
      setCalculo,
      markFirstCalculated,
    ]
  );

  const handleMapsRouteError = useCallback(() => {
    setCalculandoRota(false);
    setErroRotaMaps(true);
    setCalculo(null);
  }, [setCalculandoRota, setErroRotaMaps, setCalculo]);

  const handleNextStep = () => {
    setStepErrorKey('');

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (origem.trim().length < 3) {
        setStepErrorKey('simulator.originError');
        return;
      }
      if (destino.trim().length < 3) {
        setStepErrorKey('simulator.destinationError');
        return;
      }
      if (!mapsAvailable) {
        const km = Number(distanciaManualKm.replace(',', '.'));
        if (!km || km <= 0) {
          setStepErrorKey('simulator.demoDistanceError');
          return;
        }
      } else {
        triggerMapsCalculationIfNeeded(false);
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!dataSaida || !horaSaida) {
        setStepErrorKey('simulator.dateError');
        return;
      }
      if (servicoAtual.temRetorno && !retornoOutroDia && !horaRetorno) {
        setStepErrorKey('simulator.returnTimeError');
        return;
      }
      if (mapsAvailable && hasValidRouteText) {
        triggerMapsCalculationIfNeeded(false);
      }
      setStep(4);
    }
  };

  const validarDadosCliente = (): boolean => {
    const errors: Record<string, string> = {};
    if (nomeCliente.trim().length < 2) {
      errors.nomeCliente = 'simulator.clientNameError';
    }
    const digits = telefoneCliente.replace(/\D/g, '');
    if (digits.length < 10) {
      errors.telefoneCliente = 'simulator.clientPhoneError';
    }
    if (agendandoParaOutraPessoa) {
      if (nomePassageiro.trim().length < 2) {
        errors.nomePassageiro = 'simulator.passengerNameError';
      }
      const pDigits = telefonePassageiro.replace(/\D/g, '');
      if (pDigits.length < 10) {
        errors.telefonePassageiro = 'simulator.passengerPhoneError';
      }
    }
    setFormErrorKeys(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = () => ({
    servico: servicoAtual,
    origem,
    destino,
    dataSaida,
    horaSaida,
    horaRetorno: servicoAtual.temRetorno ? horaRetorno : undefined,
    retornoOutroDia: servicoAtual.temRetorno ? retornoOutroDia : false,
    distanciaKm: servicoAtual.idaEVolta ? distanciaIdaVoltaKm : distanciaTrechoKm,
    calculo,
    nomeCliente,
    telefoneCliente,
    agendandoParaOutraPessoa,
    nomePassageiro,
    telefonePassageiro,
    observacoes,
    origemFluxo,
    lang,
  });

  const mensagemPreview = montarMensagemWhatsApp(buildPayload());
  const whatsappHref = buildWhatsAppLink(mensagemPreview);

  const handleEnviarWhatsAppClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (step < 4) {
      e.preventDefault();
      if (!hasValidRouteText) {
        setStep(2);
        setStepErrorKey(origem.trim().length < 3 ? 'simulator.originError' : 'simulator.destinationError');
        return;
      }
      if (!dataSaida || !horaSaida) {
        setStep(3);
        setStepErrorKey('simulator.dateError');
        return;
      }
      if (servicoAtual.temRetorno && !retornoOutroDia && !horaRetorno) {
        setStep(3);
        setStepErrorKey('simulator.returnTimeError');
        return;
      }
      setStepErrorKey('');
      setStep(4);
      window.setTimeout(() => {
        clientNameInputRef.current?.focus();
      }, 60);
      return;
    }

    if (!validarDadosCliente()) {
      e.preventDefault();
      return;
    }
    const result = await registrarEEnviarAgendamento(buildPayload());
    setEnviadoResumo(result);
  };

  const handleCopiarMensagem = async () => {
    if (!validarDadosCliente()) return;
    try {
      await navigator.clipboard.writeText(mensagemPreview);
      setCopiadoSucesso(true);
      window.setTimeout(() => setCopiadoSucesso(false), 3000);
    } catch {
      // Fallback silencioso
    }
  };

  const fallbackSemCalculoHref = buildWhatsAppLink(
    montarMensagemFallbackSemCalculo({
      servicoNome: t(`services.items.${servicoId}.nomeCurto`),
      origem,
      destino,
      dataSaida,
      horaSaida,
      horaRetorno: servicoAtual.temRetorno ? horaRetorno : undefined,
      lang,
    })
  );

  const appendObservacao = (texto: string) => {
    setObservacoes((prev) => {
      if (prev.includes(texto)) return prev;
      return prev.trim() ? `${prev.trim()}; ${texto}` : texto;
    });
  };

  const formatKm = (val: number) =>
    lang === 'pt-BR' ? val.toFixed(1).replace('.', ',').replace(',0', '') : val.toFixed(1).replace('.0', '');

  const formatMoneyDisplay = (val: number) =>
    formatarMoeda(val, lang).replace(' (BRL)', '');

  const getStartingPriceLabel = (srv: ServiceDefinition) => {
    if (srv.id === 'transporte_agendado') {
      return `${t('services.fromPrice')} ${formatMoneyDisplay(PRECOS.km.D1)}${t('services.perKmSuffix')}`;
    }
    return `${t('services.fromPrice')} ${formatMoneyDisplay(PRECOS.hora.HD1)}${t('services.perHourSuffix')}`;
  };

  const getFaixaTexto = (c: CalculoResultado) => {
    const base = t(`simulator.bands.${c.detalhamento.faixaKey}`);
    if (c.detalhamento.temNoturno) {
      return `${base}${t('simulator.bands.nightSuffix')}`;
    }
    return base;
  };

  const activeCalculation = calculo;
  const hasBlockingError = Boolean(
    activeCalculation &&
      (activeCalculation.bloqueadoAntecedencia ||
        activeCalculation.bloqueadoMadrugada ||
        activeCalculation.bloqueadoTabelaIndisponivel ||
        activeCalculation.bloqueadoPernoite)
  );

  const shouldRunMapsBridge =
    mapsAvailable && ((isDrawer && isDrawerOpen) || (!isDrawer && !isDrawerOpen));

  const renderTicketValueDisplay = (giant = false) => {
    if (calculandoRota) {
      return (
        <span className={giant ? 'text-2xl sm:text-3xl text-[#E6E6E6]' : 'text-base text-[#E6E6E6]'}>
          {t('simulator.calculating')}
        </span>
      );
    }
    if (!activeCalculation || (!hasValidRouteText && !retornoOutroDia)) {
      return (
        <span
          className={
            giant
              ? 'font-brand font-light text-3xl xl:text-4xl text-[#E6E6E6]/80 leading-tight'
              : 'text-base text-[#E6E6E6]/85'
          }
        >
          {t('simulator.summary.pendingValue')}
        </span>
      );
    }
    if (activeCalculation.bloqueadoPernoite) {
      return (
        <span className={giant ? 'font-brand font-light text-3xl text-[var(--champagne)]' : 'text-base'}>
          {t('simulator.summary.overnight')}
        </span>
      );
    }
    if (hasBlockingError) {
      return (
        <span className={giant ? 'font-brand font-light text-3xl text-[var(--champagne)]' : 'text-base'}>
          {t('whatsappMessages.pricePending')}
        </span>
      );
    }
    return (
      <AnimatedCurrency
        value={activeCalculation.valorEstimado}
        lang={lang}
        animateFromZeroTrigger={firstCalculatedKey}
      />
    );
  };

  const renderBlockingOrInfoAlerts = () => {
    if (!activeCalculation || activeCalculation.alertas.length === 0) return null;
    return (
      <div className="space-y-3">
        {activeCalculation.alertas.map((alerta) => (
          <div
            key={alerta.tipo}
            role="status"
            className="p-4 rounded-[4px] bg-[var(--midnight)]/80 border border-[var(--champagne)]/70 flex items-start gap-3 text-sm text-[#E6E6E6]"
          >
            <AlertTriangle
              className="w-5 h-5 text-[var(--champagne)] shrink-0 mt-0.5"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div className="space-y-2.5 flex-1">
              <p className="leading-snug text-white">{t(`simulator.alerts.${alerta.tipo}`)}</p>
              {alerta.bloqueante && (
                <a
                  href={fallbackSemCalculoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] px-4 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-sm font-medium rounded-[4px] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{t('simulator.alerts.talkToGil')}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBreakdownPanel = () => {
    if (!activeCalculation || hasBlockingError) return null;
    return (
      <div className="border border-white/15 rounded-[4px] overflow-hidden bg-[var(--steel-dark)]">
        <button
          type="button"
          onClick={() => setMostrarDetalhamento((v) => !v)}
          aria-expanded={mostrarDetalhamento}
          className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-2 text-left text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <span>{t('simulator.seeBreakdown')}</span>
          {mostrarDetalhamento ? (
            <ChevronUp className="w-4 h-4 text-[var(--champagne)] shrink-0" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--champagne)] shrink-0" strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>

        {mostrarDetalhamento && (
          <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3 text-sm text-[#E6E6E6]">
            <p className="text-xs text-[#E6E6E6]/80 leading-relaxed">
              <strong className="text-white font-medium">{t('simulator.ruleLabel')}:</strong>{' '}
              {t(`simulator.rules.${activeCalculation.detalhamento.regraKey}`)}
            </p>

            {activeCalculation.detalhamento.margemSegurancaKm > 0 && (
              <p className="text-xs text-[var(--champagne)] tabular-nums">
                {t('simulator.roundTripKmLabel')}:{' '}
                {formatKm(activeCalculation.detalhamento.distanciaConsideradaKm)} km{' '}
                {t('simulator.marginNote', {
                  km: formatKm(activeCalculation.detalhamento.margemSegurancaKm),
                })}
              </p>
            )}

            <dl className="divide-y divide-white/10 border-y border-white/10 tabular-nums text-sm">
              {activeCalculation.detalhamento.kmCobradosTrajeto > 0 && (
                <div className="py-2 flex items-baseline justify-between gap-3">
                  <dt className="text-[#E6E6E6]/85">
                    {t('simulator.breakdown.routeLine', {
                      km: `${formatKm(activeCalculation.detalhamento.kmCobradosTrajeto)} km`,
                      unit: formatMoneyDisplay(activeCalculation.detalhamento.valorKmUnitario),
                    })}
                  </dt>
                  <dd className="font-medium text-white whitespace-nowrap">
                    {formatMoneyDisplay(activeCalculation.detalhamento.valorTrajetoKm)}
                  </dd>
                </div>
              )}

              {activeCalculation.detalhamento.valorPrimeiraHora > 0 && (
                <div className="py-2 flex items-baseline justify-between gap-3">
                  <dt className="text-[#E6E6E6]/85">{t('simulator.breakdown.firstHour')}</dt>
                  <dd className="font-medium text-white whitespace-nowrap">
                    {formatMoneyDisplay(activeCalculation.detalhamento.valorPrimeiraHora)}
                  </dd>
                </div>
              )}

              {activeCalculation.detalhamento.blocosAdicionais30Min > 0 && (
                <div className="py-2 flex items-baseline justify-between gap-3">
                  <dt className="text-[#E6E6E6]/85">
                    {t('simulator.breakdown.extraTime', {
                      count: activeCalculation.detalhamento.blocosAdicionais30Min,
                    })}
                  </dt>
                  <dd className="font-medium text-white whitespace-nowrap">
                    {formatMoneyDisplay(activeCalculation.detalhamento.valorTempoAdicional)}
                  </dd>
                </div>
              )}

              <div className="py-2 flex items-baseline justify-between gap-3">
                <dt className="text-[#E6E6E6]/85">
                  {t('simulator.breakdown.displacement', {
                    km: `${formatKm(activeCalculation.detalhamento.deslocamentoBaseKm)} km`,
                  })}
                </dt>
                <dd className="font-medium text-white whitespace-nowrap">
                  {formatMoneyDisplay(activeCalculation.detalhamento.valorDeslocamento)}
                </dd>
              </div>

              <div className="py-2 flex items-baseline justify-between gap-3">
                <dt className="text-[#E6E6E6]/85">{t('simulator.breakdown.nightSurcharge')}</dt>
                <dd className="font-medium text-white whitespace-nowrap">
                  {formatMoneyDisplay(activeCalculation.detalhamento.valorAdicionalNoturno)}
                </dd>
              </div>

              <div className="py-2.5 flex items-baseline justify-between gap-3">
                <dt className="font-medium text-white">{t('simulator.breakdown.totalEstimated')}</dt>
                <dd className="font-semibold text-base text-[var(--champagne)] whitespace-nowrap">
                  {formatMoneyDisplay(activeCalculation.valorEstimado)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    );
  };

  const renderTicketCardBody = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-[var(--champagne)]">{t('simulator.summary.title')}</p>
        {activeCalculation?.detalhamento.feriadoNome && (
          <span className="text-xs font-medium text-[var(--champagne)]">
            {activeCalculation.detalhamento.feriadoNome}
          </span>
        )}
      </div>

      <dl className="space-y-3.5 text-sm sm:text-base">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-[0.12em] text-[#E6E6E6]/70 shrink-0">
            {t('simulator.summary.service')}
          </dt>
          <dd className="font-brand font-medium text-lg text-white text-right">
            {t(`services.items.${servicoId}.nomeCurto`)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-[0.12em] text-[#E6E6E6]/70 shrink-0">
            {t('simulator.summary.origin')}
          </dt>
          <dd className="text-white text-right truncate max-w-[230px]">
            {origem.trim() || t('simulator.summary.routePending')}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-[0.12em] text-[#E6E6E6]/70 shrink-0">
            {t('simulator.summary.destination')}
          </dt>
          <dd className="text-white text-right truncate max-w-[230px]">
            {destino.trim() || t('simulator.summary.routePending')}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-[0.12em] text-[#E6E6E6]/70 shrink-0">
            {t('simulator.summary.schedule')}
          </dt>
          <dd className="text-white text-right tabular-nums">
            {formatarDataHoraPorIdioma(dataSaida, horaSaida, lang)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-[0.12em] text-[#E6E6E6]/70 shrink-0">
            {t('simulator.summary.returnLabel')}
          </dt>
          <dd className="text-[#E6E6E6] text-right tabular-nums">
            {servicoAtual.temRetorno
              ? retornoOutroDia
                ? t('simulator.summary.overnight')
                : formatarHoraPorIdioma(horaRetorno, lang)
              : t('simulator.summary.oneWayOnly')}
          </dd>
        </div>

        {activeCalculation && !hasBlockingError && hasValidRouteText && (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs uppercase tracking-[0.12em] text-[#E6E6E6]/70 shrink-0">
                {t('simulator.summary.distanceLabel')}
              </dt>
              <dd className="text-white text-right tabular-nums">
                {formatKm(activeCalculation.detalhamento.distanciaConsideradaKm)} km ·{' '}
                {duracaoDeslocamentoMin} min
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs uppercase tracking-[0.12em] text-[#E6E6E6]/70 shrink-0">
                {t('simulator.summary.rateTierLabel')}
              </dt>
              <dd className="text-[#E6E6E6] text-right text-sm leading-snug max-w-[240px]">
                {getFaixaTexto(activeCalculation)}
              </dd>
            </div>
          </>
        )}
      </dl>

      {/* Linha pontilhada animada com recortes laterais de ticket */}
      <div className="relative py-2 -mx-7 px-7">
        {!isDrawer && (
          <>
            <span
              aria-hidden="true"
              className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--midnight)] border-r border-[var(--titanium)]/55"
            />
            <span
              aria-hidden="true"
              className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--midnight)] border-l border-[var(--titanium)]/55"
            />
          </>
        )}
        <svg viewBox="0 0 360 4" className="w-full h-1 overflow-visible" aria-hidden="true">
          <line
            x1="0"
            y1="2"
            x2="360"
            y2="2"
            stroke="rgba(139, 141, 145, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="3 6"
          />
          <motion.line
            x1="0"
            y1="2"
            x2="360"
            y2="2"
            stroke="#C2A472"
            strokeWidth="1.5"
            strokeDasharray="3 6"
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: firstCalculatedKey > 0 || prefersReduced ? 1 : 0,
            }}
            transition={{ duration: prefersReduced ? 0 : 0.75, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
      </div>

      {!calculandoRota && erroRotaMaps && (
        <div className="p-4 rounded-[4px] bg-[var(--midnight)]/80 border border-[var(--champagne)] space-y-3 text-sm">
          <p className="text-white">{t('simulator.routeError')}</p>
          <a
            href={fallbackSemCalculoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] px-4 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] font-medium rounded-[4px]"
          >
            <MessageCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{t('simulator.consultWhatsapp')}</span>
          </a>
        </div>
      )}

      {!calculandoRota && !erroRotaMaps && renderBlockingOrInfoAlerts()}

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--champagne)] block">
          {t('simulator.summary.estimatedTotal')}
        </span>
        <p className="font-brand font-light text-4xl sm:text-5xl text-[var(--champagne)] leading-none tabular-nums">
          {renderTicketValueDisplay(true)}
        </p>
      </div>

      {!calculandoRota && !erroRotaMaps && renderBreakdownPanel()}

      {!hasBlockingError && (
        <div className="space-y-2.5 pt-1">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleEnviarWhatsAppClick}
            className="w-full min-h-[58px] px-5 py-3.5 inline-flex items-center justify-center gap-2.5 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base sm:text-lg font-medium rounded-[4px] transition-colors text-center gfs-btn-slide"
          >
            <MessageCircle className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{t('simulator.sendWhatsApp')}</span>
          </a>
          <p className="text-xs sm:text-sm text-[#E6E6E6]/80 text-center">
            {t('simulator.summary.disclaimer')}
          </p>
        </div>
      )}
    </div>
  );

  const formContent = (
    <div
      className={`bg-[var(--ivory)] text-[var(--midnight)] ${
        isDrawer ? '' : 'border border-[var(--border-light)] rounded-[4px] shadow-2xl'
      }`}
    >
      {qrBanner && (
        <div className="bg-[var(--steel)] text-white px-5 sm:px-6 py-4 border-b border-white/15">
          <p className="font-brand font-medium text-xl sm:text-2xl">{t('simulator.qrBanner')}</p>
        </div>
      )}

      {/* Cabeçalho e barra fina Champagne + 4 etapas numeradas */}
      <div className="bg-white px-5 sm:px-7 pt-5 pb-4 border-b border-[var(--border-light)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="eyebrow text-[var(--champagne-on-light)] tabular-nums">
            {t('simulator.stepCount', { step })}
          </span>
          <span className="text-sm font-medium text-[var(--text-muted-on-light)]">
            0{step}. {t(`simulator.steps.${step}`)}
          </span>
        </div>

        {/* Barra fina de progresso em Champagne Gold */}
        <div
          className="h-1 w-full bg-[var(--border-light)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={4}
        >
          <motion.div
            className="h-full bg-[var(--champagne)] origin-left"
            initial={false}
            animate={{ scaleX: step / 4 }}
            transition={{ duration: prefersReduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* 4 etapas clicáveis com checkmark desenhado em Champagne Gold quando concluídas */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4].map((num) => {
            const isCurrent = num === step;
            const isCompleted = num < step;
            const canClick = num <= step;
            return (
              <button
                key={num}
                type="button"
                disabled={!canClick}
                onClick={() => {
                  if (canClick) {
                    setStepErrorKey('');
                    setStep(num);
                  }
                }}
                className={`min-h-[40px] px-2 py-1.5 rounded-[4px] border text-left flex items-center gap-1.5 transition-colors ${
                  isCurrent
                    ? 'border-[var(--champagne)] bg-[#FAF5EA] text-[var(--midnight)]'
                    : isCompleted
                      ? 'border-[var(--champagne)]/40 bg-white hover:bg-[var(--ivory)] text-[var(--midnight)] cursor-pointer'
                      : 'border-transparent bg-[var(--ivory)] text-[var(--text-muted-on-light)] opacity-75 cursor-default'
                }`}
              >
                {isCompleted ? (
                  <svg
                    viewBox="0 0 16 16"
                    className="w-4 h-4 text-[var(--champagne-on-light)] shrink-0"
                    fill="none"
                    aria-hidden="true"
                  >
                    <motion.path
                      d="M3.2 8.4L6.4 11.6L12.8 4.8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: prefersReduced ? 0 : 0.35, ease: 'easeOut' }}
                    />
                  </svg>
                ) : (
                  <span
                    className={`text-xs font-semibold tabular-nums shrink-0 ${
                      isCurrent ? 'text-[var(--champagne-on-light)]' : 'text-[var(--text-muted-on-light)]'
                    }`}
                  >
                    0{num}
                  </span>
                )}
                <span className="text-xs sm:text-sm font-medium truncate">
                  {t(`simulator.steps.${num}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Corpo da etapa ativa */}
      <div className={isDrawer ? 'p-5 sm:p-6' : 'p-5 sm:p-8 lg:p-9'}>
        {/* ETAPA 1: SERVIÇO */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="font-brand font-medium text-xl sm:text-2xl text-[var(--midnight)]">
                01. {t('simulator.step1Title')}
              </h3>
              <p className="mt-1 text-sm sm:text-base text-[var(--text-muted-on-light)]">
                {t('simulator.step1Hint')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {SERVICOS.map((srv) => {
                const selected = srv.id === servicoId;
                const IconComp = getServiceIcon(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => {
                      setServicoId(srv.id);
                      setStepErrorKey('');
                      setStep(2);
                    }}
                    className={`w-full text-left p-4 sm:p-5 rounded-[4px] border transition-all flex items-start justify-between gap-4 ${
                      selected
                        ? 'bg-white border-[var(--champagne)] shadow-[0_0_0_1px_var(--champagne),0_10px_28px_rgba(194,164,114,0.18)]'
                        : 'bg-white/75 hover:bg-white border-[var(--border-light)] hover:border-[var(--titanium)]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <IconComp
                        className={`w-5 h-5 shrink-0 mt-1 transition-colors ${
                          selected ? 'text-[var(--champagne-on-light)]' : 'text-[var(--steel)]'
                        }`}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <span className="font-brand font-medium text-lg text-[var(--midnight)]">
                            {t(`services.items.${srv.id}.nome`)}
                          </span>
                          <span className="text-sm font-medium text-[var(--champagne-on-light)] tabular-nums">
                            {getStartingPriceLabel(srv)}
                          </span>
                        </div>
                        <span className="text-sm text-[var(--text-muted-on-light)] block">
                          {t('services.idealLabel')}: {t(`services.items.${srv.id}.idealPara`)}
                        </span>
                        {srv.id === 'compromisso' && (
                          <span className="text-xs sm:text-sm text-[var(--champagne-on-light)] block pt-0.5">
                            {t('simulator.typicalUses')}
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight
                      className={`w-5 h-5 shrink-0 mt-2 transition-colors ${
                        selected ? 'text-[var(--champagne-on-light)]' : 'text-[var(--titanium)]'
                      }`}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>

            <div className={`${isDrawer ? 'hidden md:flex' : 'hidden lg:flex'} justify-end pt-1`}>
              <button
                type="button"
                onClick={handleNextStep}
                className="min-h-[54px] px-7 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors gfs-btn-slide"
              >
                <span>{t('simulator.step1Continue', { service: t(`services.items.${servicoId}.nomeCurto`) })}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: TRAJETO (ORIGEM + DESTINO) */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-brand font-medium text-xl sm:text-2xl text-[var(--midnight)]">
                02. {t('simulator.step2RouteTitle')}
              </h3>
              <p className="mt-1 text-sm sm:text-base text-[var(--text-muted-on-light)]">
                {t('simulator.step2RouteHint')}
              </p>
            </div>

            <AddressAutocompleteInput
              label={t('simulator.originLabel')}
              placeholder={t('simulator.originPlaceholder')}
              value={origem}
              onChange={(val, loc) => {
                setOrigem(val);
                setOrigemLatLng(loc);
                setStepErrorKey('');
              }}
              mapsAvailable={mapsAvailable}
              quickSuggestions={presetsOrigin}
              errorMessage={stepErrorKey === 'simulator.originError' ? t(stepErrorKey) : undefined}
            />

            <AddressAutocompleteInput
              label={t('simulator.destinationLabel')}
              placeholder={t('simulator.destinationPlaceholder')}
              value={destino}
              onChange={(val, loc) => {
                setDestino(val);
                setDestinoLatLng(loc);
                setStepErrorKey('');
              }}
              mapsAvailable={mapsAvailable}
              quickSuggestions={presetsDestination}
              errorMessage={stepErrorKey === 'simulator.destinationError' ? t(stepErrorKey) : undefined}
            />

            {!mapsAvailable && (
              <div className="p-5 rounded-[4px] bg-white border border-[var(--champagne)] space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className="w-5 h-5 text-[var(--champagne-on-light)] shrink-0 mt-1"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-base font-medium text-[var(--midnight)]">
                      {t('simulator.demoTitle')}
                    </p>
                    <p className="text-sm sm:text-base text-[var(--text-muted-on-light)]">
                      {t('simulator.demoHint')}
                    </p>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor={demoKmId}
                    className="block text-base font-medium text-[var(--midnight)] mb-1.5"
                  >
                    {t('simulator.demoDistanceLabel')}
                  </label>
                  <input
                    id={demoKmId}
                    type="number"
                    min="1"
                    step="0.5"
                    value={distanciaManualKm}
                    onChange={(e) => {
                      setDistanciaManualKm(e.target.value);
                      setStepErrorKey('');
                    }}
                    className="w-full sm:w-56 min-h-[54px] px-3 py-2.5 text-lg font-medium tabular-nums bg-[var(--ivory)] text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px]"
                  />
                </div>
                {stepErrorKey === 'simulator.demoDistanceError' && (
                  <p role="alert" className="text-base font-medium text-red-700">
                    {t(stepErrorKey)}
                  </p>
                )}
              </div>
            )}

            {mapsAvailable && hasValidRouteText && (
              <RoutePreviewMap
                origin={origemLatLng ?? origem}
                destination={destinoLatLng ?? destino}
                originLatLng={origemLatLng}
                destinationLatLng={destinoLatLng}
              />
            )}

            <div className={`${isDrawer ? 'hidden md:flex' : 'hidden lg:flex'} pt-2 items-center justify-between gap-3`}>
              <button
                type="button"
                onClick={() => {
                  setStepErrorKey('');
                  setStep(1);
                }}
                className="min-h-[54px] px-5 inline-flex items-center justify-center gap-2 border border-[var(--midnight)] text-[var(--midnight)] hover:bg-white text-base font-medium rounded-[4px]"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                <span>{t('simulator.back')}</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="min-h-[54px] px-7 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base font-medium rounded-[4px] gfs-btn-slide"
              >
                <span>{t('simulator.nextDateTime')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: DATA E HORA */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-brand font-medium text-xl sm:text-2xl text-[var(--midnight)]">
                03. {t('simulator.step4Title')}
              </h3>
              <p className="mt-1 text-sm sm:text-base text-[var(--text-muted-on-light)]">
                {t('simulator.step4Hint')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={dateInputId}
                  className="block text-base font-medium text-[var(--midnight)] mb-2"
                >
                  {t('simulator.dateLabel')}
                </label>
                <div className="relative">
                  <Calendar
                    className="w-5 h-5 text-[var(--champagne-on-light)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <input
                    id={dateInputId}
                    type="date"
                    min={getTodayDate()}
                    value={dataSaida}
                    onChange={(e) => {
                      setDataSaida(e.target.value);
                      setStepErrorKey('');
                    }}
                    className="w-full min-h-[56px] pl-11 pr-3 py-3 text-lg bg-white text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={timeOutId}
                  className="block text-base font-medium text-[var(--midnight)] mb-2"
                >
                  {t('simulator.timeOutLabel')}
                </label>
                <div className="relative">
                  <Clock
                    className="w-5 h-5 text-[var(--champagne-on-light)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <input
                    id={timeOutId}
                    type="time"
                    value={horaSaida}
                    onChange={(e) => {
                      setHoraSaida(e.target.value);
                      setStepErrorKey('');
                    }}
                    className="w-full min-h-[56px] pl-11 pr-3 py-3 text-lg bg-white text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px] tabular-nums"
                  />
                </div>
              </div>
            </div>

            {servicoAtual.temRetorno && (
              <div className="p-5 rounded-[4px] bg-white border border-[var(--border-light)] space-y-4">
                <div>
                  <label
                    htmlFor={timeReturnId}
                    className="block text-base font-medium text-[var(--midnight)] mb-2"
                  >
                    {servicoId === 'passeios_viagens'
                      ? t('simulator.timeReturnTripLabel')
                      : t('simulator.timeReturnLabel')}
                  </label>
                  <input
                    id={timeReturnId}
                    type="time"
                    disabled={retornoOutroDia}
                    value={horaRetorno}
                    onChange={(e) => {
                      setHoraRetorno(e.target.value);
                      setStepErrorKey('');
                    }}
                    className="w-full sm:w-56 min-h-[56px] px-4 py-3 text-lg bg-[var(--ivory)] text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none disabled:opacity-50 rounded-[4px] tabular-nums"
                  />
                </div>

                {!retornoOutroDia && (
                  <div>
                    <p className="text-sm font-medium text-[var(--text-muted-on-light)] mb-2">
                      {t('simulator.quickDurationLabel')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 1.5, 2, 3, 4, 6, 8, 10].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => setHoraRetorno(addHoursToTime(horaSaida, hrs))}
                          className="min-h-[46px] px-3.5 py-2 text-base font-medium bg-[var(--ivory)] hover:bg-[var(--steel)] hover:text-white text-[var(--midnight)] border border-[var(--border-light)] rounded-[4px] tabular-nums transition-colors"
                        >
                          {hrs === 1.5 ? '1h30' : `${hrs}h`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-3 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={retornoOutroDia}
                    onChange={(e) => setRetornoOutroDia(e.target.checked)}
                    className="mt-1 w-6 h-6 accent-[var(--midnight)] rounded-[4px] shrink-0"
                  />
                  <span className="text-base font-medium text-[var(--midnight)]">
                    {t('simulator.overnightLabel')}
                  </span>
                </label>
              </div>
            )}

            {/* Alertas ou resultado inline visíveis na Etapa 3 */}
            {isDrawer && activeCalculation && (
              <div className="p-5 rounded-[4px] bg-[var(--steel)] text-white space-y-4">
                {renderTicketCardBody()}
              </div>
            )}

            {!isDrawer && !calculandoRota && !erroRotaMaps && activeCalculation && activeCalculation.alertas.length > 0 && (
              <div className="bg-[var(--steel)] text-white p-4 rounded-[4px]">
                {renderBlockingOrInfoAlerts()}
              </div>
            )}

            {stepErrorKey && (
              <p role="alert" className="text-base font-medium text-red-700">
                {t(stepErrorKey)}
              </p>
            )}

            <div className={`${isDrawer ? 'hidden md:flex' : 'hidden lg:flex'} pt-2 items-center justify-between gap-3`}>
              <button
                type="button"
                onClick={() => {
                  setStepErrorKey('');
                  setStep(2);
                }}
                className="min-h-[54px] px-5 inline-flex items-center justify-center gap-2 border border-[var(--midnight)] text-[var(--midnight)] hover:bg-white text-base font-medium rounded-[4px]"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                <span>{t('simulator.back')}</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="min-h-[54px] px-7 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-base font-medium rounded-[4px] gfs-btn-slide"
              >
                <span>{t('simulator.continueToBook')}</span>
                <ArrowRight className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 4: SEUS DADOS */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-brand font-medium text-xl sm:text-2xl text-[var(--midnight)]">
                04. {t('simulator.step6Title')}
              </h3>
              <p className="mt-1 text-sm sm:text-base text-[var(--text-muted-on-light)]">
                {t('simulator.step6Hint')}
              </p>
            </div>

            {isDrawer && activeCalculation && (
              <div className="p-4 rounded-[4px] bg-[var(--steel)] text-white flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-[0.14em] text-[var(--champagne)] block">
                    {t('simulator.summary.estimatedTotal')}
                  </span>
                  <span className="text-sm text-[#E6E6E6]">
                    {t(`services.items.${servicoId}.nomeCurto`)}
                  </span>
                </div>
                <span className="font-brand font-light text-3xl text-[var(--champagne)] tabular-nums">
                  {renderTicketValueDisplay(false)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={nomeId}
                  className="block text-base font-medium text-[var(--midnight)] mb-2"
                >
                  {t('simulator.clientNameLabel')}
                </label>
                <input
                  ref={clientNameInputRef}
                  id={nomeId}
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => {
                    setNomeCliente(e.target.value);
                    setFormErrorKeys((prev) => ({ ...prev, nomeCliente: '' }));
                  }}
                  placeholder={t('simulator.clientNamePlaceholder')}
                  aria-invalid={Boolean(formErrorKeys.nomeCliente)}
                  className="w-full min-h-[56px] px-4 py-3 text-lg bg-white text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px]"
                />
                {formErrorKeys.nomeCliente && (
                  <p role="alert" className="mt-1.5 text-base font-medium text-red-700">
                    {t(formErrorKeys.nomeCliente)}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={telefoneId}
                  className="block text-base font-medium text-[var(--midnight)] mb-2"
                >
                  {t('simulator.clientPhoneLabel')}
                </label>
                <input
                  id={telefoneId}
                  type="tel"
                  value={telefoneCliente}
                  onChange={(e) => {
                    setTelefoneCliente(e.target.value);
                    setFormErrorKeys((prev) => ({ ...prev, telefoneCliente: '' }));
                  }}
                  placeholder={t('simulator.clientPhonePlaceholder')}
                  aria-invalid={Boolean(formErrorKeys.telefoneCliente)}
                  className="w-full min-h-[56px] px-4 py-3 text-lg bg-white text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px] tabular-nums"
                />
                {formErrorKeys.telefoneCliente && (
                  <p role="alert" className="mt-1.5 text-base font-medium text-red-700">
                    {t(formErrorKeys.telefoneCliente)}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-[4px] bg-white border border-[var(--border-light)] space-y-4">
              <label className="flex items-start gap-3.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agendandoParaOutraPessoa}
                  onChange={(e) => setAgendandoParaOutraPessoa(e.target.checked)}
                  className="mt-1 w-6 h-6 accent-[var(--midnight)] rounded-[4px] shrink-0"
                />
                <span className="text-lg font-medium text-[var(--midnight)] inline-flex items-center gap-2">
                  <UserCheck
                    className="w-5 h-5 text-[var(--champagne-on-light)] shrink-0"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span>{t('simulator.bookingForOther')}</span>
                </span>
              </label>

              {agendandoParaOutraPessoa && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label
                      htmlFor={passageiroNomeId}
                      className="block text-base font-medium text-[var(--midnight)] mb-2"
                    >
                      {t('simulator.passengerNameLabel')}
                    </label>
                    <input
                      id={passageiroNomeId}
                      type="text"
                      value={nomePassageiro}
                      onChange={(e) => {
                        setNomePassageiro(e.target.value);
                        setFormErrorKeys((prev) => ({ ...prev, nomePassageiro: '' }));
                      }}
                      placeholder={t('simulator.passengerNamePlaceholder')}
                      aria-invalid={Boolean(formErrorKeys.nomePassageiro)}
                      className="w-full min-h-[54px] px-4 py-3 text-lg bg-[var(--ivory)] text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px]"
                    />
                    {formErrorKeys.nomePassageiro && (
                      <p role="alert" className="mt-1.5 text-base font-medium text-red-700">
                        {t(formErrorKeys.nomePassageiro)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor={passageiroTelId}
                      className="block text-base font-medium text-[var(--midnight)] mb-2"
                    >
                      {t('simulator.passengerPhoneLabel')}
                    </label>
                    <input
                      id={passageiroTelId}
                      type="tel"
                      value={telefonePassageiro}
                      onChange={(e) => {
                        setTelefonePassageiro(e.target.value);
                        setFormErrorKeys((prev) => ({ ...prev, telefonePassageiro: '' }));
                      }}
                      placeholder={t('simulator.passengerPhonePlaceholder')}
                      aria-invalid={Boolean(formErrorKeys.telefonePassageiro)}
                      className="w-full min-h-[54px] px-4 py-3 text-lg bg-[var(--ivory)] text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px] tabular-nums"
                    />
                    {formErrorKeys.telefonePassageiro && (
                      <p role="alert" className="mt-1.5 text-base font-medium text-red-700">
                        {t(formErrorKeys.telefonePassageiro)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor={obsId}
                className="block text-base font-medium text-[var(--midnight)] mb-2"
              >
                {t('simulator.notesLabel')}
              </label>
              <textarea
                id={obsId}
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder={t('simulator.notesPlaceholder')}
                className="w-full p-4 text-lg bg-white text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px]"
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {quickNotes.map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => appendObservacao(sugestao)}
                    className="min-h-[44px] px-3.5 py-2 text-sm sm:text-base font-medium bg-white hover:bg-[var(--steel)] hover:text-white text-[var(--midnight)] border border-[var(--border-light)] rounded-[4px] transition-colors"
                  >
                    + {sugestao}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleEnviarWhatsAppClick}
                className="w-full min-h-[60px] px-6 py-4 inline-flex items-center justify-center gap-3 bg-[var(--champagne)] hover:bg-[#D1B483] text-[var(--midnight)] text-lg font-medium rounded-[4px] transition-colors text-center gfs-btn-slide"
              >
                <MessageCircle className="w-6 h-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{t('simulator.sendWhatsApp')}</span>
              </a>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[52px] px-5 inline-flex items-center justify-center gap-2 border border-[var(--midnight)] text-[var(--midnight)] hover:bg-white text-base font-medium rounded-[4px]"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                  <span>{t('simulator.back')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopiarMensagem}
                  className="min-h-[52px] px-5 inline-flex items-center justify-center gap-2 border border-[var(--border-light)] bg-white hover:bg-[var(--steel)] hover:text-white text-[var(--midnight)] text-base font-medium rounded-[4px] transition-colors"
                >
                  <Copy className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    {copiadoSucesso ? t('simulator.copiedMessage') : t('simulator.copyMessage')}
                  </span>
                </button>
              </div>

              {enviadoResumo && (
                <div className="p-4 rounded-[4px] bg-white border border-[var(--border-light)] text-base text-[var(--midnight)]">
                  <p className="font-medium mb-1">{t('simulator.preparedSummaryTitle')}</p>
                  <pre className="whitespace-pre-wrap font-brand text-sm sm:text-base text-[var(--text-muted-on-light)]">
                    {enviadoResumo.mensagemTexto}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barra mobile fixa / expansível no rodapé do simulador (< lg) */}
      <div
        className={`${
          isDrawer ? 'md:hidden' : 'lg:hidden'
        } sticky bottom-0 z-30 border-t border-white/15 bg-[var(--steel)] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.35)]`}
      >
        {mobileTicketExpanded && (
          <div className="p-5 border-b border-white/15 bg-[var(--steel)] max-h-[65vh] overflow-y-auto">
            {renderTicketCardBody()}
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-between gap-3 bg-[var(--steel)]">
          <button
            type="button"
            onClick={() => setMobileTicketExpanded((v) => !v)}
            aria-expanded={mobileTicketExpanded}
            className="text-left flex-1 min-w-0"
          >
            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--champagne)] flex items-center gap-1">
              <span>{t('simulator.summary.estimatedTotal')}</span>
              {mobileTicketExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </span>
            <span className="font-brand font-light text-xl text-white tabular-nums block truncate">
              {renderTicketValueDisplay(false)}
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setStepErrorKey('');
                  setStep((s) => Math.max(1, s - 1));
                }}
                aria-label={t('simulator.back')}
                className="min-h-[48px] px-3 inline-flex items-center justify-center border border-white/30 text-white rounded-[4px]"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}

            {step < 4 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="min-h-[48px] px-5 inline-flex items-center justify-center gap-2 bg-[var(--champagne)] active:bg-[#B2925E] text-[var(--midnight)] font-medium text-base rounded-[4px]"
              >
                <span>{t('simulator.summary.continueBtn')}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {shouldRunMapsBridge && (
        <MapsRouteCalculatorBridge
          requestKey={routeRequestKey}
          origin={origemLatLng ?? origem}
          destination={destinoLatLng ?? destino}
          needsRoundTrip={servicoAtual.idaEVolta}
          onResult={handleMapsRouteResult}
          onError={handleMapsRouteError}
        />
      )}

      {isDrawer ? (
        formContent
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <Reveal className="lg:col-span-7">{formContent}</Reveal>

          {/* Ticket Card Lateral (Desktop Sticky) com stagger de 80ms */}
          <Reveal delay={0.08} className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24">
            <aside
              aria-label={t('simulator.summary.title')}
              className="relative bg-[var(--steel)] text-[#E6E6E6] border border-[var(--titanium)]/55 rounded-[4px] p-7 shadow-2xl"
            >
              {renderTicketCardBody()}
            </aside>
          </Reveal>
        </div>
      )}
    </div>
  );
};
