import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ProtectedRoute, PermissionRoute } from './routes/guards';

import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import CasesPage from './pages/Cases/CasesPage';
import CaseDetailsPage from './pages/Cases/CaseDetailsPage';
import DocumentsPage from './pages/Documents/DocumentsPage';
import DocumentDetailsPage from './pages/Documents/DocumentDetailsPage';
import UploadDocumentPage from './pages/UploadDocument/UploadDocumentPage';
import OcrResultPage from './pages/OCR/OcrResultPage';
import SearchPage from './pages/Search/SearchPage';
import IntegrityPage from './pages/IntegrityVerification/IntegrityPage';
import ActivityHistoryPage from './pages/ActivityHistory/ActivityHistoryPage';
import VersionHistoryPage from './pages/VersionHistory/VersionHistoryPage';
import ReportsPage from './pages/Reports/ReportsPage';
import UsersPage from './pages/Users/UsersPage';
import SettingsPage from './pages/Settings/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

const App: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    <Route
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />

      <Route path="/cases" element={<PermissionRoute permission="case.view"><CasesPage /></PermissionRoute>} />
      <Route path="/cases/:caseId" element={<PermissionRoute permission="case.view"><CaseDetailsPage /></PermissionRoute>} />

      <Route path="/documents" element={<PermissionRoute permission="document.view"><DocumentsPage /></PermissionRoute>} />
      <Route path="/documents/upload" element={<PermissionRoute permission="document.upload"><UploadDocumentPage /></PermissionRoute>} />
      <Route path="/documents/:docId" element={<PermissionRoute permission="document.view"><DocumentDetailsPage /></PermissionRoute>} />
      <Route path="/documents/:docId/ocr" element={<PermissionRoute permission="document.ocr"><OcrResultPage /></PermissionRoute>} />

      <Route path="/search" element={<PermissionRoute permission="search.use"><SearchPage /></PermissionRoute>} />

      <Route path="/security/integrity" element={<PermissionRoute permission="document.verify"><IntegrityPage /></PermissionRoute>} />
      <Route path="/security/activity" element={<PermissionRoute permission="activity.view"><ActivityHistoryPage /></PermissionRoute>} />
      <Route path="/security/versions" element={<PermissionRoute permission="version.view"><VersionHistoryPage /></PermissionRoute>} />

      <Route path="/reports" element={<PermissionRoute permission="reports.view"><ReportsPage /></PermissionRoute>} />
      <Route path="/users" element={<PermissionRoute permission="users.manage"><UsersPage /></PermissionRoute>} />
      <Route path="/settings" element={<SettingsPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default App;
