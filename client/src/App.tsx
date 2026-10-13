import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { RawMaterialDockView } from './views/RawMaterialDockView';
import { PdiTemplateStudioView } from './views/PdiTemplateStudioView';
import { TabletInspectorView } from './views/TabletInspectorView';
import { SupervisorApprovalView } from './views/SupervisorApprovalView';
import { MrbPortalView } from './views/MrbPortalView';
import { ProductionTravelersView } from './views/ProductionTravelersView';
import { ShippingInterlockView } from './views/ShippingInterlockView';
import { SpcAnalyticsView } from './views/SpcAnalyticsView';
import { TraceabilityView } from './views/TraceabilityView';
import { ShiftHandoverView } from './views/ShiftHandoverView';
import { AuditTrailView } from './views/AuditTrailView';
import { PublicCoaModal } from './views/PublicCoaModal';
import { UserRole } from './types';
import { api } from './utils/api';
import { sounds } from './utils/audio';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Plant Manager');
  const [gloveMode, setGloveMode] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [activeCoaTravelerId, setActiveCoaTravelerId] = useState<string | null>(null);

  // Check offline queue in localStorage
  const checkSyncCount = () => {
    try {
      const queue = JSON.parse(localStorage.getItem('zapuza_offline_inspections') || '[]');
      setPendingSyncCount(queue.length);
    } catch {
      setPendingSyncCount(0);
    }
  };

  useEffect(() => {
    checkSyncCount();
  }, []);

  // When returning to online mode, auto-sync (Section 13.2)
  useEffect(() => {
    if (!isOffline && pendingSyncCount > 0) {
      handleSync();
    }
  }, [isOffline]);

  const handleSync = async () => {
    sounds.playTactileClick();
    const res = await api.syncOfflineInspections();
    if (res.syncedCount > 0) {
      sounds.playPassChime();
      alert(`Auto-Sync Completed: ${res.syncedCount} offline tablet inspection records synchronized with plant server!`);
    }
    checkSyncCount();
  };

  // Switch role tabs automatically for natural role workflows if desired
  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'QA Floor Inspector') {
      setCurrentTab('tablet-inspector');
      setGloveMode(true);
    } else if (newRole === 'Quality Engineer') {
      setCurrentTab('blueprint-studio');
    } else if (newRole === 'Shift Supervisor') {
      setCurrentTab('supervisor-queue');
    } else if (newRole === 'Dispatch Clerk') {
      setCurrentTab('shipping-interlock');
    } else if (newRole === 'Plant Manager') {
      setCurrentTab('dashboard');
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${gloveMode ? 'glove-mode' : ''}`}>
      {/* Universal Factory OS Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={handleRoleChange}
        gloveMode={gloveMode}
        setGloveMode={setGloveMode}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        pendingSyncCount={pendingSyncCount}
        onSync={handleSync}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView onNavigate={setCurrentTab} gloveMode={gloveMode} />
        )}

        {currentTab === 'raw-material' && (
          <RawMaterialDockView />
        )}

        {currentTab === 'blueprint-studio' && (
          <PdiTemplateStudioView />
        )}

        {currentTab === 'tablet-inspector' && (
          <TabletInspectorView
            isOffline={isOffline}
            gloveMode={gloveMode}
            onRefreshSyncCount={checkSyncCount}
          />
        )}

        {currentTab === 'supervisor-queue' && (
          <SupervisorApprovalView />
        )}

        {currentTab === 'mrb-portal' && (
          <MrbPortalView />
        )}

        {currentTab === 'travelers' && (
          <ProductionTravelersView />
        )}

        {currentTab === 'shipping-interlock' && (
          <ShippingInterlockView onOpenPublicCoa={(id) => setActiveCoaTravelerId(id)} />
        )}

        {currentTab === 'spc-analytics' && (
          <SpcAnalyticsView />
        )}

        {currentTab === 'traceability' && (
          <TraceabilityView onOpenPublicCoa={(id) => setActiveCoaTravelerId(id)} />
        )}

        {currentTab === 'shift-handover' && (
          <ShiftHandoverView />
        )}

        {currentTab === 'audit-trail' && (
          <AuditTrailView />
        )}
      </main>

      {/* Customer Certificate of Analysis (CoA) Modal when scanning crate QR */}
      {activeCoaTravelerId && (
        <PublicCoaModal
          travelerId={activeCoaTravelerId}
          onClose={() => setActiveCoaTravelerId(null)}
        />
      )}

      {/* Footer */}
      <footer className="no-print bg-slate-950 border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        Zapuza Technologies LLP • Factory Operations & Quality Control System v5.0 • AS9100D & ISO 9001:2015 Compliant
      </footer>
    </div>
  );
}

export default App;
