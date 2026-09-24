import React from 'react';
import { Landmark, Shield, BookOpen, Scale, Award, Database, HeartHandshake } from 'lucide-react';
import { DemoBanner } from '../components/archive/DemoBanner';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F4EFE6] text-ink pb-16">
      <DemoBanner />

      {/* Broadsheet Proclamation Masthead */}
      <section className="bg-[#FAF6EE] text-ink py-10 px-4 sm:px-6 lg:px-8 border-b-2 border-double border-ink shadow-sm">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="font-mono text-[11px] text-oxblood uppercase tracking-widest font-bold">
            GOVERNMENT OF INDIA • RECORD DIVISION • ARCHIVAL CHARTER & REPOSITORY ACT
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-black tracking-tight text-ink">
            Archival Charter & Institutional Scope
          </h1>
          <p className="text-stone-700 text-xs sm:text-sm max-w-2xl mx-auto font-editorial italic leading-relaxed">
            Preserving the seminal thoughts, manuscripts, constitutional deliberations, and audiovisual records of Dr. B. R. Ambedkar for scholars, students, and citizens worldwide.
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Core Vision Proclamation */}
        <div className="bg-[#FAF6EE] border-2 border-ink p-8 shadow-letterpress space-y-4">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <h2 className="font-serif text-2xl font-black text-ink uppercase tracking-wide">
              Foundational Archival Charter
            </h2>
            <span className="text-[11px] font-mono text-oxblood font-bold">[ OAIS CERTIFIED ]</span>
          </div>
          <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-editorial text-justify">
            <span className="broadsheet-drop-cap">T</span>he Ambedkar Digital Heritage Archive is conceived as a premier national cultural repository dedicated to safeguarding the historical legacy of Dr. Bhimrao Ramji Ambedkar (1891–1956). Through advanced non-destructive multi-spectral digitization, verified Dublin Core metadata standards, and open institutional access, the platform bridges physical memorial archives with universal public access.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FAF6EE] p-6 border-2 border-ink shadow-letterpress-sm space-y-3">
            <div className="w-10 h-10 bg-[#EFE8DA] text-ink border border-ink flex items-center justify-center font-bold">
              <Database className="w-5 h-5 text-oxblood" />
            </div>
            <h3 className="font-serif font-bold text-base text-ink">
              ISO 14721 OAIS Compliance
            </h3>
            <p className="text-xs text-stone-700 font-editorial leading-relaxed">
              Adheres strictly to the Open Archival Information System reference standard, ensuring long-term preservation masters in uncompressed TIFF and PDF/A-1b formats.
            </p>
          </div>

          <div className="bg-[#FAF6EE] p-6 border-2 border-ink shadow-letterpress-sm space-y-3">
            <div className="w-10 h-10 bg-[#EFE8DA] text-ink border border-ink flex items-center justify-center font-bold">
              <Shield className="w-5 h-5 text-oxblood" />
            </div>
            <h3 className="font-serif font-bold text-base text-ink">
              Cryptographic Integrity
            </h3>
            <p className="text-xs text-stone-700 font-editorial leading-relaxed">
              Every digital folio, audio file, and debate transcript is hashed with SHA-256 digital signatures to prevent tampering and guarantee academic citation validity.
            </p>
          </div>

          <div className="bg-[#FAF6EE] p-6 border-2 border-ink shadow-letterpress-sm space-y-3">
            <div className="w-10 h-10 bg-[#EFE8DA] text-ink border border-ink flex items-center justify-center font-bold">
              <Scale className="w-5 h-5 text-oxblood" />
            </div>
            <h3 className="font-serif font-bold text-base text-ink">
              Open Educational Access
            </h3>
            <p className="text-xs text-stone-700 font-editorial leading-relaxed">
              Dedicated to public domain access for civic education, constitutional jurisprudence, and historical inquiry without paywalls or proprietary restrictions.
            </p>
          </div>
        </div>

        {/* Advisory & Standards */}
        <div className="bg-[#FAF6EE] border-2 border-ink p-8 shadow-letterpress-sm space-y-4">
          <h3 className="font-serif font-black text-xl text-ink border-b-2 border-ink pb-2">
            Curatorial Principles & Institutional Scope
          </h3>
          <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-editorial">
            The platform delivers a comprehensive institutional digital archive—incorporating verified Dublin Core cataloging, OCR digitization, hybrid lexical-vector retrieval, source-grounded RAG, interactive knowledge graphs, and RFC 7233 audio-visual streaming. In strict accordance with institutional rigor, no unverified AI responses, hallucinated facts, or synthetic OCR outputs are presented as authentic primary records.
          </p>
          <div className="pt-3 border-t border-ink/20 text-xs font-mono text-oxblood font-bold flex justify-between">
            <span>SIH26096 Digital Heritage Archive</span>
            <span>PRES-REG-1950/2026</span>
          </div>
        </div>
      </main>
    </div>
  );
};
