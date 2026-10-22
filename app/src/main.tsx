import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts'
import './styles/tokens.css'
import './styles/base.css'
import './i18n'
import { App } from './app/App'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, networkMode: 'offlineFirst' }, mutations: { networkMode: 'offlineFirst' } },
})

// The first screen is known from the last launch, so fetch its chunk while the database opens instead of after.
try {
  void import(localStorage.getItem('onda.ob') === '1' ? './screens/OndasTab' : './screens/Onboarding')
  if (matchMedia('(min-width: 1100px)').matches) void import('./desk/DeskShell')
} catch {
  /* private mode */
}

// iOS only applies :active styles when a touch listener exists on the document.
document.addEventListener('touchstart', () => undefined, { passive: true })
// Pinch and double-tap zoom are browser chrome, not app behaviour.
document.addEventListener('gesturestart', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
