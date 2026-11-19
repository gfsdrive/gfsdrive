import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CalculoResultado, ServiceId, isFimDeSemanaOuFeriado } from '../lib/calcularPreco';

export interface SimulatorPreset {
  servicoId?: ServiceId;
  origem?: string;
  origemLatLng?: { lat: number; lng: number };
  destino?: string;
  destinoLatLng?: { lat: number; lng: number };
  dataSaida?: string;
  horaSaida?: string;
  horaRetorno?: string;
  agendandoParaOutraPessoa?: boolean;
  startAtStep?: number;
  origemFluxo?: 'site' | 'melhor_idade' | 'qr';
  qrBanner?: boolean;
}

export function getDefaultFutureDate(): string {
  for (let offset = 1; offset <= 14; offset++) {
    const candidate = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const y = candidate.getFullYear();
    const m = String(candidate.getMonth() + 1).padStart(2, '0');
    const d = String(candidate.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    if (!isFimDeSemanaOuFeriado(formatted).especial) {
      return formatted;
    }
  }
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface SimulatorContextValue {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  servicoId: ServiceId;
  setServicoId: React.Dispatch<React.SetStateAction<ServiceId>>;
  origem: string;
  setOrigem: React.Dispatch<React.SetStateAction<string>>;
  origemLatLng: { lat: number; lng: number } | undefined;
  setOrigemLatLng: React.Dispatch<React.SetStateAction<{ lat: number; lng: number } | undefined>>;
  destino: string;
  setDestino: React.Dispatch<React.SetStateAction<string>>;
  destinoLatLng: { lat: number; lng: number } | undefined;
  setDestinoLatLng: React.Dispatch<React.SetStateAction<{ lat: number; lng: number } | undefined>>;

  dataSaida: string;
  setDataSaida: React.Dispatch<React.SetStateAction<string>>;
  horaSaida: string;
  setHoraSaida: React.Dispatch<React.SetStateAction<string>>;
  horaRetorno: string;
  setHoraRetorno: React.Dispatch<React.SetStateAction<string>>;
  retornoOutroDia: boolean;
  setRetornoOutroDia: React.Dispatch<React.SetStateAction<boolean>>;

  distanciaManualKm: string;
  setDistanciaManualKm: React.Dispatch<React.SetStateAction<string>>;
  distanciaTrechoKm: number;
  setDistanciaTrechoKm: React.Dispatch<React.SetStateAction<number>>;
  distanciaIdaVoltaKm: number;
  setDistanciaIdaVoltaKm: React.Dispatch<React.SetStateAction<number>>;
  deslocamentoKm: number;
  setDeslocamentoKm: React.Dispatch<React.SetStateAction<number>>;
  duracaoDeslocamentoMin: number;
  setDuracaoDeslocamentoMin: React.Dispatch<React.SetStateAction<number>>;

  calculandoRota: boolean;
  setCalculandoRota: React.Dispatch<React.SetStateAction<boolean>>;
  erroRotaMaps: boolean;
  setErroRotaMaps: React.Dispatch<React.SetStateAction<boolean>>;
  routeRequestKey: number;
  setRouteRequestKey: React.Dispatch<React.SetStateAction<number>>;
  mostrarDetalhamento: boolean;
  setMostrarDetalhamento: React.Dispatch<React.SetStateAction<boolean>>;
  calculo: CalculoResultado | null;
  setCalculo: React.Dispatch<React.SetStateAction<CalculoResultado | null>>;
  firstCalculatedKey: number;
  markFirstCalculated: () => void;

  nomeCliente: string;
  setNomeCliente: React.Dispatch<React.SetStateAction<string>>;
  telefoneCliente: string;
  setTelefoneCliente: React.Dispatch<React.SetStateAction<string>>;
  agendandoParaOutraPessoa: boolean;
  setAgendandoParaOutraPessoa: React.Dispatch<React.SetStateAction<boolean>>;
  nomePassageiro: string;
  setNomePassageiro: React.Dispatch<React.SetStateAction<string>>;
  telefonePassageiro: string;
  setTelefonePassageiro: React.Dispatch<React.SetStateAction<string>>;
  observacoes: string;
  setObservacoes: React.Dispatch<React.SetStateAction<string>>;

  stepErrorKey: string;
  setStepErrorKey: React.Dispatch<React.SetStateAction<string>>;
  formErrorKeys: Record<string, string>;
  setFormErrorKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  enviadoResumo: { whatsappUrl: string; mensagemTexto: string } | null;
  setEnviadoResumo: React.Dispatch<
    React.SetStateAction<{ whatsappUrl: string; mensagemTexto: string } | null>
  >;

  isDrawerOpen: boolean;
  drawerOrigemFluxo: 'site' | 'melhor_idade' | 'qr';
  drawerQrBanner: boolean;
  applyPreset: (preset: SimulatorPreset) => void;
  openDrawer: (preset?: SimulatorPreset, triggerEl?: HTMLElement | null) => void;
  closeDrawer: () => void;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [step, setStep] = useState<number>(1);
  const [servicoId, setServicoId] = useState<ServiceId>('compromisso');
  const [origem, setOrigem] = useState<string>('');
  const [origemLatLng, setOrigemLatLng] = useState<{ lat: number; lng: number } | undefined>();
  const [destino, setDestino] = useState<string>('');
  const [destinoLatLng, setDestinoLatLng] = useState<{ lat: number; lng: number } | undefined>();

  const [dataSaida, setDataSaida] = useState<string>(getDefaultFutureDate);
  const [horaSaida, setHoraSaida] = useState<string>('09:30');
  const [horaRetorno, setHoraRetorno] = useState<string>('11:00');
  const [retornoOutroDia, setRetornoOutroDia] = useState<boolean>(false);

  const [distanciaManualKm, setDistanciaManualKm] = useState<string>('12');
  const [distanciaTrechoKm, setDistanciaTrechoKm] = useState<number>(12);
  const [distanciaIdaVoltaKm, setDistanciaIdaVoltaKm] = useState<number>(24);
  const [deslocamentoKm, setDeslocamentoKm] = useState<number>(0);
  const [duracaoDeslocamentoMin, setDuracaoDeslocamentoMin] = useState<number>(22);

  const [calculandoRota, setCalculandoRota] = useState<boolean>(false);
  const [erroRotaMaps, setErroRotaMaps] = useState<boolean>(false);
  const [routeRequestKey, setRouteRequestKey] = useState<number>(0);
  const [mostrarDetalhamento, setMostrarDetalhamento] = useState<boolean>(false);
  const [calculo, setCalculo] = useState<CalculoResultado | null>(null);
  const [firstCalculatedKey, setFirstCalculatedKey] = useState<number>(0);

  const markFirstCalculated = useCallback(() => {
    setFirstCalculatedKey((prev) => (prev === 0 ? 1 : prev));
  }, []);

  const [nomeCliente, setNomeCliente] = useState<string>('');
  const [telefoneCliente, setTelefoneCliente] = useState<string>('');
  const [agendandoParaOutraPessoa, setAgendandoParaOutraPessoa] = useState<boolean>(false);
  const [nomePassageiro, setNomePassageiro] = useState<string>('');
  const [telefonePassageiro, setTelefonePassageiro] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  const [stepErrorKey, setStepErrorKey] = useState<string>('');
  const [formErrorKeys, setFormErrorKeys] = useState<Record<string, string>>({});
  const [enviadoResumo, setEnviadoResumo] = useState<{
    whatsappUrl: string;
    mensagemTexto: string;
  } | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerOrigemFluxo, setDrawerOrigemFluxo] = useState<'site' | 'melhor_idade' | 'qr'>('site');
  const [drawerQrBanner, setDrawerQrBanner] = useState<boolean>(false);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const applyPreset = useCallback((preset: SimulatorPreset) => {
    if (preset.servicoId) setServicoId(preset.servicoId);
    if (typeof preset.origem === 'string') setOrigem(preset.origem);
    if (preset.origemLatLng) setOrigemLatLng(preset.origemLatLng);
    if (typeof preset.destino === 'string') setDestino(preset.destino);
    if (preset.destinoLatLng) setDestinoLatLng(preset.destinoLatLng);
    if (preset.dataSaida) setDataSaida(preset.dataSaida);
    if (preset.horaSaida) setHoraSaida(preset.horaSaida);
    if (preset.horaRetorno) setHoraRetorno(preset.horaRetorno);
    if (typeof preset.agendandoParaOutraPessoa === 'boolean') {
      setAgendandoParaOutraPessoa(preset.agendandoParaOutraPessoa);
    }
    if (typeof preset.startAtStep === 'number') {
      setStep(Math.max(1, Math.min(4, preset.startAtStep)));
    }
    if (preset.origemFluxo) {
      setDrawerOrigemFluxo(preset.origemFluxo);
    }
    if (typeof preset.qrBanner === 'boolean') {
      setDrawerQrBanner(preset.qrBanner);
    }
    setStepErrorKey('');
  }, []);

  const openDrawer = useCallback(
    (preset?: SimulatorPreset, triggerEl?: HTMLElement | null) => {
      const candidate =
        triggerEl ??
        (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      if (candidate && candidate !== document.body) {
        lastTriggerRef.current = candidate;
      }

      if (preset) {
        applyPreset(preset);
      }
      setIsDrawerOpen(true);
    },
    [applyPreset]
  );

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    const target = lastTriggerRef.current;
    lastTriggerRef.current = null;
    if (target && typeof target.focus === 'function') {
      window.setTimeout(() => {
        target.focus();
      }, 20);
    }
  }, []);

  return (
    <SimulatorContext.Provider
      value={{
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
        drawerOrigemFluxo,
        drawerQrBanner,
        applyPreset,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export function useSimulator(): SimulatorContextValue {
  const ctx = useContext(SimulatorContext);
  if (!ctx) {
    throw new Error('useSimulator must be used inside SimulatorProvider');
  }
  return ctx;
}
