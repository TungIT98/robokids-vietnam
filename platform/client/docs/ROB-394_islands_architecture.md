# Islands Architecture & Partial Hydration Spec

**Issue:** ROB-399
**Status:** Draft
**Author:** CTO
**Date:** 2026-04-13
**Goal:** ROB-376 Audit - Critical Q2 2026

---

## Executive Summary

Current SPA architecture loads ~2-3MB of JS on initial page load, causing 4-8s Time-to-Interactive on low-end devices common in Vietnamese schools. Islands Architecture reduces this to <500KB initial JS by deferring all interactive components until needed.

**Target:** Zero-JS by default, hydrate on interaction.

---

## 1. Current Architecture Analysis

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| UI Library | Chakra UI |
| 3D Graphics | @react-three/fiber + drei |
| State | Zustand |
| Visual Programming | Google Blockly |
| Real-time | MQTT.js, Jitsi iframe |

### Bundle Analysis (Estimated)
| Component | JS Size | Hydration |
|-----------|---------|-----------|
| React + Router + Chakra | ~400KB | Always |
| Blockly IDE | ~800KB | On lesson page |
| Space Academy 3D | ~600KB | On space page |
| ChatPanel | ~100KB | On interaction |
| Page Shell (each) | ~50KB | Per page |

### Critical Finding
**Problem:** Every page loads the full Chakra UI + React runtime even for static content pages like `CertificateVerificationPage` which only displays text.

---

## 2. Component Classification Map

### Type S: Static (Server-Rendered, Zero JS)

| Component | Rationale |
|-----------|-----------|
| `LandingPage` | Marketing content, no interactivity |
| `LoginPage` | Simple form, can use native HTML |
| `SignupPage` | Simple form, can use native HTML |
| `CertificateVerificationPage` | Read-only display |
| `Leaderboard` | Read-only data display |
| `BadgeGrid` | Read-only display |
| `ProgressChart` | Static SVG charts |
| `SchoolAdminDashboard` (read views) | Data tables |
| `CurriculumBrowser` | Content list (expandable but mostly static) |

**Implementation:** SSR with static HTML, optional `<details>` for accordion.

### Type I: Interactive Island (Hydrate on Interaction)

| Component | Rationale | Hydration Trigger |
|-----------|----------|-------------------|
| `BlocklyIDE` | Visual programming environment | Page focus / tab activation |
| `SpaceAcademySimulator` | 3D WebGL simulation | Tab activation |
| `ChatPanel` | Real-time messaging | User scroll / click |
| `HintModal` | AI tutor overlay | Blockly interaction |
| `HardwareGarage` | Hardware template selection | Tab activation |
| `LiveClassRoom` | WebRTC video | Join button click |
| `JitsiMeetEmbed` | Video conferencing | Join button click |

**Implementation:** Dynamic import + Intersection Observer / user gesture.

### Type H: Hybrid (Shell + Islands)

| Component | Strategy |
|-----------|----------|
| `LessonView` | Static lesson content (S) + BlocklyIDE island (I) |
| `MissionsPage` | Mission list (S) + SpaceAcademySimulator island (I) |
| `StudentDashboard` | Static stats (S) + BlocklyIDE + ChatPanel islands (I) |
| `ParentDashboard` | Read-only views (S) + ProgressTracking (H) |
| `SpaceAcademyPage` | Shell with tabs, content lazy-loads |

### Type T: Third-Party iframe Isolation

| Component | Strategy |
|-----------|----------|
| `JitsiMeetEmbed` | iframe with `allow=""` |
| `CertificateDownloadPage` | PDF in iframe (lazy) |

---

## 3. Partial Hydration Implementation Strategy

### Phase 1: React Server Components Shell (if migrating to Next.js/Astro)

If staying on React SPA, implement manual lazy hydration:

```typescript
// islands/LazyIsland.tsx
import { lazy, Suspense, useEffect, useState } from 'react';

interface LazyIslandProps {
  load: () => Promise<any>;
  placeholder?: React.ReactNode;
  hydrationTrigger?: 'viewport' | 'interaction' | 'immediate';
}

export function LazyIsland({
  load,
  placeholder,
  hydrationTrigger = 'viewport'
}: LazyIslandProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [shouldHydrate, setShouldHydrate] = useState(
    hydrationTrigger === 'immediate'
  );

  useEffect(() => {
    if (shouldHydrate) {
      load().then((module) => {
        setComponent(() => module.default);
      });
    }
  }, [shouldHydrate, load]);

  useEffect(() => {
    if (hydrationTrigger === 'viewport') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldHydrate(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );
      // Attach to placeholder element
      return () => observer.disconnect();
    }
  }, [hydrationTrigger]);

  if (!Component) return <>{placeholder}</>;
  return <Component />;
}
```

### Phase 2: Island Registry

```typescript
// islands/registry.ts
export const ISLAND_MANIFEST = {
  'blockly-ide': {
    load: () => import('../components/BlocklyIDE'),
    trigger: 'viewport' as const,
    prefetchOn: 'hover' as const,
  },
  'space-simulator': {
    load: () => import('../components/space/SpaceAcademySimulator'),
    trigger: 'viewport' as const,
    prefetchOn: 'hover' as const,
  },
  'chat-panel': {
    load: () => import('../components/ChatPanel'),
    trigger: 'interaction' as const,
    prefetchOn: 'idle' as const,
  },
  'hardware-garage': {
    load: () => import('../components/HardwareGarage'),
    trigger: 'viewport' as const,
    prefetchOn: 'hover' as const,
  },
} as const;
```

### Phase 3: Route-Level Code Splitting

Current `React.lazy()` already does route-level splitting. Enhance with prefetch:

```typescript
// utils/prefetchUtils.ts (existing) - extend for islands
export function prefetchIsland(islandName: keyof typeof ISLAND_MANIFEST) {
  const config = ISLAND_MANIFEST[islandName];
  if (config.prefetchOn === 'hover') {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    // Dynamic import triggers webpack prefetch
    config.load();
  }
}
```

---

## 4. Migration Roadmap

### Effort Estimate: 1-2 weeks

| Week | Tasks |
|------|-------|
| **Week 1** | 1. Identify all Type S pages (static pages) <br> 2. Implement `LazyIsland` component <br> 3. Migrate `HardwareGarage`, `HintModal` to lazy islands <br> 4. Add prefetch on hover for `SpaceAcademyPage` |
| **Week 2** | 1. Migrate `BlocklyIDE` to lazy island <br> 2. Migrate `SpaceAcademySimulator` to lazy island <br> 3. Migrate `ChatPanel` to lazy island <br> 4. Audit and test all pages <br> 5. Performance measurement |

### Immediate Wins (Day 1)
1. `CertificateVerificationPage` - remove React Chakra, use plain HTML
2. `BadgeGrid`, `Leaderboard` - static render with CSS only
3. Add `loading="lazy"` for below-fold images

### High-Impact Islands (Week 1-2)
1. **BlocklyIDE** - 800KB savings per non-lesson page
2. **SpaceAcademySimulator** - 600KB savings on non-space pages

---

## 5. Blockly IDE Specific Optimization

`BlocklyIDE` is the heaviest component at ~800KB.

### Current State
```typescript
// BlocklyIDE.tsx
export default function BlocklyIDE({ ... }) {
  // Always loaded, even on pages that don't use it
}
```

### Target State
```typescript
// islands/BlocklyIsland.tsx
export const BlocklyIsland = lazy(() => import('./BlocklyIDE'));

export function BlocklyIslandWrapper(props: BlocklyIDEProps) {
  return (
    <Suspense fallback={<BlocklySkeleton />}>
      <BlocklyIsland {...props} />
    </Suspense>
  );
}
```

### Hydration Strategy for Blockly
- **Trigger:** Tab/button activation (user intent to code)
- **Prefetch:** On `LessonView` mount, prefetch Blockly after 2s idle
- **Skeleton:** Show block-shaped placeholder during load

---

## 6. Space Academy Specific Optimization

`SpaceAcademySimulator` uses `@react-three/fiber` (600KB) + drei + textures.

### Current State
- 3D scene loads on `SpaceAcademyPage` mount
- Even if user hasn't selected hardware template

### Target State
```typescript
// Only load 3D engine when hardware selected
function SpaceAcademyShell() {
  const { hardwareTemplateId } = useSpaceRobotStore();

  return (
    <div>
      <HardwareGarage /> {/* lightweight, fast */}
      {hardwareTemplateId && (
        <LazyIsland
          island="space-simulator"
          load={() => import('./space/SpaceAcademySimulator')}
          placeholder={<SimulatorSkeleton />}
        />
      )}
    </div>
  );
}
```

---

## 7. Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Initial JS (landing) | ~400KB | ~150KB |
| Initial JS (dashboard) | ~1.2MB | ~400KB |
| Time to Interactive | 4-8s | <2s |
| Largest Contentful Paint | 3-5s | <1.5s |

---

## 8. Dependencies & Prerequisites

- Vite 5.x (already using)
- React 18.x (already using)
- `@loadable/component` or native `lazy()` (already using)
- `react-intersection-observer` for viewport detection

**No new frameworks required** - can implement within React SPA using existing lazy loading.

---

## 9. Blocking Issues

- **None** - can implement incrementally
- Current `prefetchUtils.ts` is a good foundation

---

## 10. Deliverables Checklist

- [x] Technical spec document (this file)
- [ ] `LazyIsland` component implementation
- [ ] Island registry for all Type I components
- [ ] Migrate 5 priority islands (Blockly, SpaceSimulator, Chat, HintModal, HardwareGarage)
- [ ] Performance audit post-migration
- [ ] Update webpack/vite config if needed for optimal code splitting

---

## References

- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [Pattern: Partial Hydration](https:// pattern Islands /partial-hydration)
- ROB-376: Platform Architecture Audit
