# Voxel Builder Integration - Agent Prompts

## Context
RoboKids Vietnam đang tích hợp voxel 3D builder (giống growvoxly) vào platform. Đã tạo Phase 1 core components. Cần agent hoàn thiện.

## Phase 1 Files Đã Tạo
- `src/stores/voxelStore.ts` - Zustand store cho voxel state
- `src/components/voxel/VoxelGrid.tsx` - 3D grid system
- `src/components/voxel/VoxelCanvas.tsx` - Main 3D canvas
- `src/components/voxel/VoxelBuilder.tsx` - UI sidebar
- `src/pages/VoxelBuilderPage.tsx` - Page mới
- `App.tsx` - Đã thêm route `/voxel-builder`

## CTO Agent Prompt - Hoàn Thiện Voxel Builder

```
Bạn là CTO của RoboKids Vietnam. Hoàn thiện voxel builder theo checklist sau:

### 1. Fix VoxelGrid.tsx
- Kiểm tra import `ThreeEvent` từ `@react-three/fiber`
- Đảm bảo `VoxelBlock` component hoạt động đúng
- Test click to add/remove voxels

### 2. Integrate với existing 3D infrastructure
- Tham khảo `RobotSimulator3D.tsx` để học cách setup physics
- Tham khảo `SpaceAcademySimulator.tsx` để học lighting setup
- Kết hợp physics (Rapier) nếu cần

### 3. Thêm keyboard shortcuts
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- Delete: Remove selected voxel

### 4. AI Integration (Phase 2)
- Tạo service gọi MiniMax API để generate voxel từ text prompt
- Kết nối với `VoxelBuilder.tsx` AI section
- Prompt format cho AI: "Generate a {description} voxel structure"

### 5. Curriculum Integration
- Tạo lesson template cho voxel building
- Kết nối với existing curriculum system (xem `curriculum/beginner-lessons.ts`)

### 6. Gamification
- Thêm XP reward khi tạo voxel (10 XP per voxel)
- Badge "Voxel Master" khi tạo 50 voxels
- Share creation → bonus XP

## Tech Stack
- React 18 + TypeScript
- @react-three/fiber + @react-three/drei + @react-three/rapier
- Zustand (store: `voxelStore.ts`)
- Chakra UI (components)
- MiniMax API (AI)

## References
- `platform/client/src/components/simulation/RobotSimulator3D.tsx`
- `platform/client/src/components/space/SpaceAcademySimulator.tsx`
- `platform/client/src/stores/gamificationStore.ts`
- `platform/client/src/curriculum/beginner-lessons.ts`

## Deliverable
Pull request với:
1. Fixed VoxelGrid.tsx
2. Keyboard shortcuts
3. AI integration service
4. Updated VoxelBuilderPage với loading states
```

## AI Engineer Prompt - AI Voxel Generation

```
Bạn là AI Engineer của RoboKids Vietnam. Implement AI-powered voxel generation:

### Nhiệm vụ
1. Tạo `src/services/voxelAiService.ts`:
   - Gọi MiniMax API (đã có key trong env)
   - Parse response thành voxel data format
   - Fallback nếu API fail

2. Prompt template:
   - Input: "một con robot màu xanh dương"
   - Output: JSON array [{x, y, z, color}]

3. Demo với:
   - Cherry blossom tree
   - Simple robot
   - House

### MiniMax API Integration
- Endpoint: MiniMax API
- Model: appropriate vision/text model
- Rate limit handling

## Deliverable
- `src/services/voxelAiService.ts`
- Demo prompt results
```

## Frontend Developer Prompt - UI Polish

```
Bạn là Frontend Developer của RoboKids Vietnam. Polish voxel builder UI:

### 1. VoxelBuilder.tsx Improvements
- Add loading spinner khi AI generating
- Add tooltip descriptions cho colors
- Animation khi add/remove voxels
- Mobile responsive layout

### 2. Color Palette Enhancement
- Kid-friendly colors (giữ colors hiện tại)
- Add color mixer/picker option
- Preset robot colors

### 3. UX Improvements
- Tutorial overlay cho first-time users
- Achievement popup khi hoàn thành
- Sound effects (optional)

### 4. Testing
- Unit test cho voxelStore
- Integration test cho VoxelGrid
- E2E test cho add/remove flow

## Deliverable
- Enhanced VoxelBuilder.tsx
- Unit tests
```
