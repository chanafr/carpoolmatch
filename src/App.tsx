import { useCallback, useEffect, useState } from 'react';
import { CarpoolProvider } from './state/CarpoolContext';
import { TopBar } from './components/TopBar';
import type { View } from './components/TopBar';
import { FairnessMeter } from './components/FairnessMeter';
import { ScheduleGrid } from './components/ScheduleGrid';
import type { RideFilter } from './components/ScheduleGrid';
import { SwapModal } from './components/SwapModal';
import { FamiliesView } from './components/FamiliesView';
import { StaleBanner, Toast } from './components/Feedback';
import { AgentChatDock } from './components/AgentChat';

function Shell() {
  const [view, setView] = useState<View>('schedule');
  const [filter, setFilter] = useState<RideFilter>('all');
  const [swapRideId, setSwapRideId] = useState<string | null>(null);
  const [flashRideId, setFlashRideId] = useState<string | null>(null);

  useEffect(() => {
    if (!flashRideId) return;
    const t = setTimeout(() => setFlashRideId(null), 2000);
    return () => clearTimeout(t);
  }, [flashRideId]);

  const closeSwap = useCallback(() => setSwapRideId(null), []);

  return (
    <div className="min-h-dvh pb-36">
      <TopBar view={view} onViewChange={setView} />
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
        {view === 'schedule' ? (
          <>
            <StaleBanner />
            <FairnessMeter />
            <ScheduleGrid filter={filter} onFilterChange={setFilter} onSwap={setSwapRideId} flashRideId={flashRideId} />
          </>
        ) : (
          <FamiliesView />
        )}
      </main>
      {swapRideId && <SwapModal key={swapRideId} rideId={swapRideId} onClose={closeSwap} onSwapped={setFlashRideId} />}
      <Toast />
      <AgentChatDock />
    </div>
  );
}

export default function App() {
  return (
    <CarpoolProvider>
      <Shell />
    </CarpoolProvider>
  );
}
