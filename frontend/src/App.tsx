import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { KioskProvider, useKiosk } from './context/KioskContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { KioskBar } from './components/layout/KioskBar';

// Critical path pages loaded eagerly for instant First Contentful Paint
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';

// Archival BroadSheet Loading Fallback for Suspense
const ArchivalLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-ink">
    <div className="font-mono text-xs uppercase tracking-widest text-[#79402C] mb-2 animate-pulse">
      ── Retrieving Archival Ledger ──
    </div>
    <div className="font-serif italic text-sm text-ink/70">
      Consulting primary historical registers...
    </div>
  </div>
);

// Route-based code splitting for secondary public pages
const ExplorePage = lazy(() => import('./pages/ExplorePage').then(m => ({ default: m.ExplorePage })));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const ManuscriptsPage = lazy(() => import('./pages/ManuscriptsPage').then(m => ({ default: m.ManuscriptsPage })));
const SpeechesPage = lazy(() => import('./pages/SpeechesPage').then(m => ({ default: m.SpeechesPage })));
const DebatesPage = lazy(() => import('./pages/DebatesPage').then(m => ({ default: m.DebatesPage })));
const MediaPage = lazy(() => import('./pages/MediaPage').then(m => ({ default: m.MediaPage })));
const MediaDetailPage = lazy(() => import('./pages/MediaDetailPage').then(m => ({ default: m.MediaDetailPage })));
const TimelinePage = lazy(() => import('./pages/TimelinePage').then(m => ({ default: m.TimelinePage })));
const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage').then(m => ({ default: m.KnowledgeGraphPage })));
const EntityDetailPage = lazy(() => import('./pages/EntityDetailPage').then(m => ({ default: m.EntityDetailPage })));
const ResearchPage = lazy(() => import('./pages/ResearchPage').then(m => ({ default: m.ResearchPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const DemoPage = lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })));
const SystemStatusPage = lazy(() => import('./pages/SystemStatusPage').then(m => ({ default: m.SystemStatusPage })));

// Admin Pages (Lazy loaded in dedicated bundle chunk)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminDemoControlPage = lazy(() => import('./pages/admin/AdminDemoControlPage').then(m => ({ default: m.AdminDemoControlPage })));
const AdminDocumentsPage = lazy(() => import('./pages/admin/AdminDocumentsPage').then(m => ({ default: m.AdminDocumentsPage })));
const AdminDocumentNewPage = lazy(() => import('./pages/admin/AdminDocumentNewPage').then(m => ({ default: m.AdminDocumentNewPage })));
const AdminCollectionsPage = lazy(() => import('./pages/admin/AdminCollectionsPage').then(m => ({ default: m.AdminCollectionsPage })));
const AdminImportPage = lazy(() => import('./pages/admin/AdminImportPage').then(m => ({ default: m.AdminImportPage })));
const AdminMediaPage = lazy(() => import('./pages/admin/AdminMediaPage').then(m => ({ default: m.AdminMediaPage })));
const AdminMediaNewPage = lazy(() => import('./pages/admin/AdminMediaNewPage').then(m => ({ default: m.AdminMediaNewPage })));
const AdminMediaTranscriptPage = lazy(() => import('./pages/admin/AdminMediaTranscriptPage').then(m => ({ default: m.AdminMediaTranscriptPage })));
const AdminMediaIntegrityPage = lazy(() => import('./pages/admin/AdminMediaIntegrityPage').then(m => ({ default: m.AdminMediaIntegrityPage })));
const AdminMetadataPage = lazy(() => import('./pages/admin/AdminMetadataPage').then(m => ({ default: m.AdminMetadataPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage').then(m => ({ default: m.AdminAuditPage })));
const AdminOCRPage = lazy(() => import('./pages/admin/AdminOCRPage').then(m => ({ default: m.AdminOCRPage })));
const AdminOCRDetailPage = lazy(() => import('./pages/admin/AdminOCRDetailPage').then(m => ({ default: m.AdminOCRDetailPage })));
const AdminOCRReviewPage = lazy(() => import('./pages/admin/AdminOCRReviewPage').then(m => ({ default: m.AdminOCRReviewPage })));
const AdminSearchIndexPage = lazy(() => import('./pages/admin/AdminSearchIndexPage').then(m => ({ default: m.AdminSearchIndexPage })));
const AdminTranslationsPage = lazy(() => import('./pages/admin/AdminTranslationsPage').then(m => ({ default: m.AdminTranslationsPage })));
const AdminTranslationDetailPage = lazy(() => import('./pages/admin/AdminTranslationDetailPage').then(m => ({ default: m.AdminTranslationDetailPage })));
const AdminLanguagesPage = lazy(() => import('./pages/admin/AdminLanguagesPage').then(m => ({ default: m.AdminLanguagesPage })));
const AdminKnowledgeGraphPage = lazy(() => import('./pages/admin/AdminKnowledgeGraphPage').then(m => ({ default: m.AdminKnowledgeGraphPage })));
const AdminTimelinePage = lazy(() => import('./pages/admin/AdminTimelinePage').then(m => ({ default: m.AdminTimelinePage })));
const AdminKiosksPage = lazy(() => import('./pages/admin/AdminKiosksPage').then(m => ({ default: m.AdminKiosksPage })));
const AdminKioskDetailPage = lazy(() => import('./pages/admin/AdminKioskDetailPage').then(m => ({ default: m.AdminKioskDetailPage })));
const AdminSecurityPage = lazy(() => import('./pages/admin/AdminSecurityPage').then(m => ({ default: m.AdminSecurityPage })));

// Kiosk Pages (Lazy loaded in dedicated museum bundle chunk)
const KioskGraphPage = lazy(() => import('./pages/kiosk/KioskGraphPage').then(m => ({ default: m.KioskGraphPage })));
const KioskTimelinePage = lazy(() => import('./pages/kiosk/KioskTimelinePage').then(m => ({ default: m.KioskTimelinePage })));
const KioskEntityPage = lazy(() => import('./pages/kiosk/KioskEntityPage').then(m => ({ default: m.KioskEntityPage })));
const KioskMediaPage = lazy(() => import('./pages/kiosk/KioskMediaPage').then(m => ({ default: m.KioskMediaPage })));
const KioskMediaDetailPage = lazy(() => import('./pages/kiosk/KioskMediaDetailPage').then(m => ({ default: m.KioskMediaDetailPage })));

const AppContent: React.FC = () => {
  const location = useLocation();
  const { isKiosk } = useKiosk();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className={`min-h-screen flex flex-col font-sans ${isKiosk ? 'kiosk-mode pb-20' : ''}`}>
      {!isAdmin && <Header />}
      
      <main id="main-content" className="flex-1">
        <Suspense fallback={<ArchivalLoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/manuscripts" element={<ManuscriptsPage />} />
            <Route path="/speeches" element={<SpeechesPage />} />
            <Route path="/debates" element={<DebatesPage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/media/:mediaId" element={<MediaDetailPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/entities/:entityId" element={<EntityDetailPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/about" element={<AboutPage />} />

            {/* SIH 2024 Demo Mode & System Status */}
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/demo/control" element={<AdminDemoControlPage />} />
            <Route path="/system-status" element={<SystemStatusPage />} />

            {/* Kiosk Routes */}
            <Route path="/kiosk/graph" element={<KioskGraphPage />} />
            <Route path="/kiosk/timeline" element={<KioskTimelinePage />} />
            <Route path="/kiosk/entity/:entityId" element={<KioskEntityPage />} />
            <Route path="/kiosk/media" element={<KioskMediaPage />} />
            <Route path="/kiosk/media/:mediaId" element={<KioskMediaDetailPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="demo" element={<AdminDemoControlPage />} />
              <Route path="system-status" element={<SystemStatusPage />} />
              <Route path="documents" element={<AdminDocumentsPage />} />
              <Route path="documents/new" element={<AdminDocumentNewPage />} />
              <Route path="ocr" element={<AdminOCRPage />} />
              <Route path="ocr/:jobId" element={<AdminOCRDetailPage />} />
              <Route path="ocr/:jobId/pages/:pageId" element={<AdminOCRReviewPage />} />
              <Route path="search-index" element={<AdminSearchIndexPage />} />
              <Route path="knowledge-graph" element={<AdminKnowledgeGraphPage />} />
              <Route path="timeline" element={<AdminTimelinePage />} />
              <Route path="translations" element={<AdminTranslationsPage />} />
              <Route path="translations/:translationId" element={<AdminTranslationDetailPage />} />
              <Route path="languages" element={<AdminLanguagesPage />} />
              <Route path="collections" element={<AdminCollectionsPage />} />
              <Route path="import" element={<AdminImportPage />} />
              <Route path="media" element={<AdminMediaPage />} />
              <Route path="media/new" element={<AdminMediaNewPage />} />
              <Route path="media/integrity" element={<AdminMediaIntegrityPage />} />
              <Route path="media/:mediaId/transcripts" element={<AdminMediaTranscriptPage />} />
              <Route path="kiosks" element={<AdminKiosksPage />} />
              <Route path="kiosks/:id" element={<AdminKioskDetailPage />} />
              <Route path="security" element={<AdminSecurityPage />} />
              <Route path="metadata" element={<AdminMetadataPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>
          </Routes>
        </Suspense>
      </main>

      {!isAdmin && !isKiosk && <Footer />}
      <KioskBar />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <KioskProvider>
        <LanguageProvider>
          <Router>
            <AppContent />
          </Router>
        </LanguageProvider>
      </KioskProvider>
    </AuthProvider>
  );
};

export default App;
