import React, { useCallback, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, X } from 'lucide-react';
import { isQuotaError, useAutocompleteSuggestions } from '../hooks/useAutocompleteSuggestions';

interface QuickPlaceItem {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string, latLng?: { lat: number; lng: number }) => void;
  mapsAvailable: boolean;
  quickSuggestions?: QuickPlaceItem[];
  errorMessage?: string;
}

const AutocompleteWithMaps: React.FC<AddressAutocompleteInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  quickSuggestions = [],
  errorMessage,
}) => {
  const { t, i18n } = useTranslation();
  const inputId = useId();
  const placesLib = useMapsLibrary('places');
  const [isOpen, setIsOpen] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const { suggestions, isLoading, resetSession } = useAutocompleteSuggestions(
    value,
    isOpen && !justSelected,
    i18n.language === 'en' ? 'en' : 'pt-BR'
  );

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['formattedAddress', 'displayName', 'location'],
        });
        const formatted =
          place.formattedAddress ||
          suggestion.placePrediction.text.text ||
          value;
        const loc = place.location
          ? { lat: place.location.lat(), lng: place.location.lng() }
          : undefined;
        setJustSelected(true);
        setIsOpen(false);
        onChange(formatted, loc);
        resetSession();
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        const fallbackText = suggestion.placePrediction.text.text;
        setJustSelected(true);
        setIsOpen(false);
        onChange(fallbackText, undefined);
        resetSession();
      }
    },
    [placesLib, onChange, resetSession, value]
  );

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="block text-base sm:text-lg font-medium text-[var(--midnight)] mb-2"
      >
        {label}
      </label>

      <div className="relative">
        <MapPin
          className="w-5 h-5 text-[var(--champagne-on-light)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 180);
          }}
          onChange={(e) => {
            setJustSelected(false);
            setIsOpen(true);
            onChange(e.target.value, undefined);
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={Boolean(errorMessage)}
          className="w-full min-h-[58px] pl-11 pr-24 py-3.5 text-lg bg-white text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px] transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('', undefined);
              setJustSelected(false);
              setIsOpen(false);
            }}
            aria-label={t('simulator.clearFieldAria', { label })}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[48px] px-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--midnight)] hover:bg-[var(--ivory)] rounded-[4px] whitespace-nowrap"
          >
            <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('simulator.clear')}</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <p role="alert" className="mt-2 text-base font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      {isOpen && (isLoading || suggestions.length > 0) && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 w-full bg-white border border-[var(--midnight)] rounded-[4px] overflow-hidden max-h-80 overflow-y-auto shadow-lg"
        >
          {isLoading && suggestions.length === 0 && (
            <li className="px-4 py-4 text-base text-[var(--text-muted-on-light)]">
              {t('simulator.searchingAddresses')}
            </li>
          )}
          {suggestions.map((suggestion, idx) => (
            <li key={suggestion.placePrediction?.placeId || idx}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void handleSelectSuggestion(suggestion);
                }}
                className="w-full text-left px-4 py-4 min-h-[56px] text-base sm:text-lg text-[var(--midnight)] hover:bg-[var(--ivory)] border-b last:border-b-0 border-[var(--border-light)] flex items-start gap-3 transition-colors"
              >
                <MapPin
                  className="w-5 h-5 text-[var(--champagne-on-light)] shrink-0 mt-1"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span>{suggestion.placePrediction?.text.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {quickSuggestions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-[var(--text-muted-on-light)] mb-2">
            {t('simulator.quickPlacesLabel')}
          </p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setJustSelected(true);
                  setIsOpen(false);
                  onChange(item.address, { lat: item.lat, lng: item.lng });
                }}
                className="min-h-[48px] px-3.5 py-2 text-sm sm:text-base font-medium bg-white hover:bg-[var(--steel)] hover:text-white text-[var(--midnight)] border border-[var(--border-light)] hover:border-[var(--steel)] rounded-[4px] transition-colors whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = (props) => {
  const { t } = useTranslation();
  const inputId = useId();

  if (props.mapsAvailable) {
    return <AutocompleteWithMaps {...props} />;
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-base sm:text-lg font-medium text-[var(--midnight)] mb-2"
      >
        {props.label}
      </label>
      <div className="relative">
        <MapPin
          className="w-5 h-5 text-[var(--champagne-on-light)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value, undefined)}
          placeholder={props.placeholder}
          aria-invalid={Boolean(props.errorMessage)}
          className="w-full min-h-[58px] pl-11 pr-24 py-3.5 text-lg bg-white text-[var(--midnight)] border border-[var(--border-light)] focus:border-[var(--midnight)] focus:outline-none rounded-[4px] transition-colors"
        />
        {props.value && (
          <button
            type="button"
            onClick={() => props.onChange('', undefined)}
            aria-label={t('simulator.clearFieldAria', { label: props.label })}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[48px] px-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--midnight)] hover:bg-[var(--ivory)] rounded-[4px] whitespace-nowrap"
          >
            <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            <span>{t('simulator.clear')}</span>
          </button>
        )}
      </div>
      {props.errorMessage && (
        <p role="alert" className="mt-2 text-base font-medium text-red-700">
          {props.errorMessage}
        </p>
      )}
      {props.quickSuggestions && props.quickSuggestions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-[var(--text-muted-on-light)] mb-2">
            {t('simulator.quickPlacesLabel')}
          </p>
          <div className="flex flex-wrap gap-2">
            {props.quickSuggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => props.onChange(item.address, { lat: item.lat, lng: item.lng })}
                className="min-h-[48px] px-3.5 py-2 text-sm sm:text-base font-medium bg-white hover:bg-[var(--steel)] hover:text-white text-[var(--midnight)] border border-[var(--border-light)] hover:border-[var(--steel)] rounded-[4px] transition-colors whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
