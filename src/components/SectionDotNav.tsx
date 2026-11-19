import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DotSection {
  id: string;
  labelKey: string;
}

const SECTIONS: DotSection[] = [
  { id: 'hero', labelKey: 'dotNav.hero' },
  { id: 'simulador', labelKey: 'dotNav.simulator' },
  { id: 'destaques', labelKey: 'dotNav.blocks' },
  { id: 'servicos', labelKey: 'dotNav.services' },
  { id: 'como-funciona', labelKey: 'dotNav.howItWorks' },
  { id: 'duvidas', labelKey: 'dotNav.faq' },
  { id: 'contato', labelKey: 'dotNav.contact' },
];

export const SectionDotNav: React.FC = () => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string>('hero');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(id);
            }
          });
        },
        { rootMargin: '-40% 0px -45% 0px', threshold: 0.01 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      aria-label={t('dotNav.label')}
      className="hidden xl:flex fixed left-6 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-3.5"
    >
      {SECTIONS.map((sec) => {
        const isActive = activeId === sec.id;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => handleJump(sec.id)}
            aria-label={t(sec.labelKey)}
            aria-current={isActive ? 'location' : undefined}
            title={t(sec.labelKey)}
            className="group p-1.5 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--champagne)]"
          >
            <span
              className={`block rounded-full transition-all duration-200 ${
                isActive
                  ? 'w-3 h-3 bg-[var(--champagne)] ring-2 ring-[var(--champagne)]/35'
                  : 'w-2 h-2 border border-[var(--titanium)] bg-transparent group-hover:border-[var(--champagne)]'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
};
