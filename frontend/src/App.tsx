import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { KioskProvider, useKiosk } from './context/KioskContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { KioskBar } from './components/layout/KioskBar';

// Public Pages
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ManuscriptsPage } from './pages/ManuscriptsPage';
import { SpeechesPage } from './pages/SpeechesPage';
import { DebatesPage } from './pages/DebatesPage';
import { MediaPage } from './pages/MediaPage';
import { MediaDetailPage } from './pages/MediaDetailPage';
import { TimelinePage } from './pages/TimelinePage';
import { ResearchPage } from './pages/ResearchPage';
import { AboutPage } from './pages/AboutPage';
import { SearchPage } from './pages/SearchPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { EntityDetailPage } from './pages/EntityDetailPage';
import { DemoPage } from './pages/DemoPage';
import { SystemStatusPage } from './pages/SystemStatusPage';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminDemoControlPage } from './pages/admin/AdminDemoControlPage';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';
import { AdminDocumentNewPage } from './pages/admin/AdminDocumentNewPage';
import { AdminCollectionsPage } from './pages/admin/AdminCollectionsPage';
import { AdminImportPage } from './pages/admin/AdminImportPage';
import { AdminMediaPage } from './pages/admin/AdminMediaPage';
import { AdminMediaNewPage } from './pages/admin/AdminMediaNewPage';
import { AdminMediaTranscriptPage } from './pages/admin/AdminMediaTranscriptPage';
import { AdminMediaIntegrityPage } from './pages/admin/AdminMediaIntegrityPage';
import { AdminMetadataPage } from './pages/admin/AdminMetadataPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminOCRPage } from './pages/admin/AdminOCRPage';
import { AdminOCRDetailPage } from './pages/admin/AdminOCRDetailPage';
import { AdminOCRReviewPage } from './pages/admin/AdminOCRReviewPage';
import { AdminSearchIndexPage } from './pages/admin/AdminSearchIndexPage';
import { AdminTranslationsPage } from './pages/admin/AdminTranslationsPage';
import { AdminTranslationDetailPage } from './pages/admin/AdminTranslationDetailPage';
import { AdminLanguagesPage } from './pages/admin/AdminLanguagesPage';
import { AdminKnowledgeGraphPage } from './pages/admin/AdminKnowledgeGraphPage';
import { AdminTimelinePage } from './pages/admin/AdminTimelinePage';
import { AdminKiosksPage } from './pages/admin/AdminKiosksPage';
import { AdminKioskDetailPage } from './pages/admin/AdminKioskDetailPage';
import { AdminSecurityPage } from './pages/admin/AdminSecurityPage';

// Kiosk Pages
import { KioskGraphPage } from './pages/kiosk/KioskGraphPage';
import { KioskTimelinePage } from './pages/kiosk/KioskTimelinePage';
import { KioskEntityPage } from './pages/kiosk/KioskEntityPage';
import { KioskMediaPage } from './pages/kiosk/KioskMediaPage';
import { KioskMediaDetailPage } from './pages/kiosk/KioskMediaDetailPage';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { isKiosk } = useKiosk();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className={`min-h-screen flex flex-col font-sans ${isKiosk ? 'kiosk-mode pb-20' : ''}`}>
      {!isAdmin && <Header />}
      
      <main id="main-content" className="flex-1">
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
