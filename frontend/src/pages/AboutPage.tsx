import React from 'react';
import { Landmark, Shield, BookOpen, Scale, Award, Database, HeartHandshake } from 'lucide-react';
import { DemoBanner } from '../components/archive/DemoBanner';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner />

      <section className="bg-[#1B2A4A] text-white py-14 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs text-heritage-300 uppercase tracking-widest">
            INSTITUTIONAL MISSION & ARCHIVAL CHARTER
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold">
            About the Ambedkar Digital Heritage Archive
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed">
            Preserving the seminal thoughts, manuscripts, constitutional deliberations, and audiovisual records of Dr. B. R. Ambedkar for scholars, students, and citizens worldwide.
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Core Vision */}
        <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm space-y-4">
          <h2 className="font-serif text-2xl font-bold text-ink-900 border-b border-stone-200 pb-2">
            Archival Charter & Digital Provenance
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed font-serif text-justify">
            The Ambedkar Digital Heritage Archive is conceived as a premier national cultural repository dedicated to safeguarding the historical legacy of Dr. Bhimrao Ramji Ambedkar (1891–1956). Through advanced non-destructive multi-spectral digitization, verified Dublin Core metadata standards, and open institutional access, the platform bridges physical memorial archives with universal public access.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-stone-200 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base text-ink-900">
              ISO 14721 OAIS Compliance
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Adheres strictly to the Open Archival Information System reference standard, ensuring long-term preservation masters in uncompressed TIFF and PDF/A-1b formats.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-national-100 text-national-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base text-ink-900">
              Cryptographic Integrity
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every digital folio, audio file, and debate transcript is hashed with SHA-256 digital signatures to prevent tampering and guarantee academic citation validity.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base text-ink-900">
              Open Educational Access
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dedicated to public domain access for civic education, constitutional jurisprudence, and historical inquiry without paywalls or proprietary restrictions.
            </p>
          </div>
        </div>

        {/* Advisory & Standards */}
        <div className="bg-white border border-stone-200 rounded-xl p-8 space-y-4">
          <h3 className="font-serif font-bold text-xl text-ink-900 border-b border-stone-200 pb-2">
            Curatorial Principles & Phase 1 Scope
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            During Phase 1, the platform establishes the architectural foundation—schema design, REST services, responsive layouts, and touchscreen kiosk capabilities. In strict accordance with institutional rigor, no unverified AI responses, hallucinated facts, or synthetic OCR outputs are presented as authentic archival materials.
          </p>
          <div className="pt-2 text-xs font-mono text-heritage-700">
            SIH26096 Digital Heritage Archive • Smart India Hackathon
          </div>
        </div>
      </main>
    </div>
  );
};
