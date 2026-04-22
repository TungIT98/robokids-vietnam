/**
 * Voxel Lessons - Curriculum for Voxel Builder feature
 *
 * Age groups: beginner (6-8), intermediate (9-12), advanced (13-16)
 * Part of PROJ-PLATFORM-MISSIONS and GOAL-2026-1
 */

// Demo lessons for voxel building
export const VOXEL_LESSONS = {
  beginner: [
    {
      id: 'voxel-beginner-01',
      slug: 'hello-voxel',
      title: 'Chào Voxel!',
      titleVi: 'Chào Voxel!',
      ageGroup: 'beginner',
      difficulty: 'basic',
      estimatedMinutes: 15,
      objectives: [
        'Hiểu voxel là gì',
        'Thêm voxel đầu tiên',
        'Di chuyển camera'
      ],
      steps: [
        {
          id: 'step-1',
          order: 1,
          title: 'Voxel là gì?',
          descriptionVi: 'Voxel là những khối nhỏ xếp lại với nhau tạo thành hình 3D. Giống như LEGO!',
          allowedBlocks: [],
          labelVi: 'Voxel là khối 3D'
        },
        {
          id: 'step-2',
          order: 2,
          title: 'Thêm voxel đầu tiên',
          descriptionVi: 'Chọn công cụ Thêm (dấu +), chọn màu yêu thích, click vào lưới để thêm voxel!',
          allowedBlocks: ['add_voxel'],
          labelVi: 'Click để thêm'
        },
        {
          id: 'step-3',
          order: 3,
          title: 'Xoay camera',
          descriptionVi: 'Kéo chuột để xoay view. Cuộn chuột để phóng to/thu nhỏ.',
          allowedBlocks: [],
          labelVi: 'Xoay view'
        }
      ],
      availableBlocks: ['add_voxel'],
      tags: ['voxel', 'basics']
    },
    {
      id: 'voxel-beginner-02',
      slug: 'build-tower',
      title: 'Xây Tháp',
      titleVi: 'Xây Tháp',
      ageGroup: 'beginner',
      difficulty: 'basic',
      estimatedMinutes: 20,
      objectives: [
        'Xếp voxels thành hình tháp',
        'Sử dụng nhiều màu sắc'
      ],
      steps: [
        {
          id: 'step-1',
          order: 1,
          title: 'Tháp là gì?',
          descriptionVi: 'Tháp cao dần từ dưới lên. Mỗi tầng ít hơn tầng dưới 1 voxel mỗi cạnh.',
          allowedBlocks: [],
          labelVi: 'Tháp xếp chồng'
        },
        {
          id: 'step-2',
          order: 2,
          title: 'Tầng 1',
          descriptionVi: 'Xếp 5x5 voxels làm đế tháp. Chọn màu xám.',
          allowedBlocks: ['add_voxel'],
          labelVi: 'Tầng đế'
        },
        {
          id: 'step-3',
          order: 3,
          title: 'Tầng 2-4',
          descriptionVi: 'Giảm kích thước mỗi tầng: 4x4, 3x3, 2x2. Dùng nhiều màu sắc!',
          allowedBlocks: ['add_voxel'],
          labelVi: 'Các tầng trên'
        }
      ],
      availableBlocks: ['add_voxel', 'remove_voxel'],
      tags: ['voxel', 'building']
    }
  ],
  intermediate: [
    {
      id: 'voxel-intermediate-01',
      slug: 'build-robot',
      title: 'Robot Voxel',
      titleVi: 'Robot Voxel',
      ageGroup: 'intermediate',
      difficulty: 'intermediate',
      estimatedMinutes: 30,
      objectives: [
        'Xây robot với body, head, arms, legs',
        'Sử dụng nhiều màu cho từng bộ phận'
      ],
      steps: [
        {
          id: 'step-1',
          order: 1,
          title: 'Thiết kế robot',
          descriptionVi: 'Robot gồm: thân (body), đầu (head), tay (arms), chân (legs). Mỗi bộ phận một màu khác nhau!',
          allowedBlocks: [],
          labelVi: 'Cấu trúc robot'
        },
        {
          id: 'step-2',
          order: 2,
          title: 'Xây thân',
          descriptionVi: 'Body: 2x3x2 voxels màu xanh dương. Đặt ở giữa lưới.',
          allowedBlocks: ['add_voxel'],
          labelVi: 'Thân robot'
        },
        {
          id: 'step-3',
          order: 3,
          title: 'Xây đầu',
          descriptionVi: 'Head: 2x2x2 voxels màu sáng hơn. Đặt trên thân. Thêm mắt màu xanh lá!',
          allowedBlocks: ['add_voxel'],
          labelVi: 'Đầu robot'
        },
        {
          id: 'step-4',
          order: 4,
          title: 'Xây tay và chân',
          descriptionVi: 'Arms: 1x2x1 voxels mỗi bên. Legs: 1x2x1 voxels. Dùng màu tối hơn.',
          allowedBlocks: ['add_voxel'],
          labelVi: 'Tay và chân'
        }
      ],
      availableBlocks: ['add_voxel', 'remove_voxel', 'paint_voxel'],
      tags: ['voxel', 'robot', 'building']
    }
  ],
  advanced: [
    {
      id: 'voxel-advanced-01',
      slug: 'ai-voxel-creation',
      title: 'AI Tạo Voxel',
      titleVi: 'AI Tạo Voxel',
      ageGroup: 'advanced',
      difficulty: 'advanced',
      estimatedMinutes: 25,
      objectives: [
        'Sử dụng AI để tạo voxel từ mô tả',
        'Chỉnh sửa voxel AI tạo ra',
        'Kết hợp AI và thủ công'
      ],
      steps: [
        {
          id: 'step-1',
          order: 1,
          title: 'Giới thiệu AI Voxel',
          descriptionVi: 'AI có thể tạo voxel từ mô tả! Ví dụ: "robot màu đỏ" hoặc "cây có lá vàng".',
          allowedBlocks: [],
          labelVi: 'AIVoxel'
        },
        {
          id: 'step-2',
          order: 2,
          title: 'Thử AI đầu tiên',
          descriptionVi: 'Nhập "simple robot" vào ô AI và nhấn Tạo voxel. Xem AI tạo gì!',
          allowedBlocks: ['ai_generate'],
          labelVi: 'Tạo bằng AI'
        },
        {
          id: 'step-3',
          order: 3,
          title: 'Chỉnh sửa',
          descriptionVi: 'Dùng công cụ Remove để bớt voxels AI tạo thừa. Dùng Paint để đổi màu!',
          allowedBlocks: ['add_voxel', 'remove_voxel', 'paint_voxel'],
          labelVi: 'Chỉnh sửa'
        },
        {
          id: 'step-4',
          order: 4,
          title: 'Sáng tạo kết hợp',
          descriptionVi: 'AI tạo base, bạn thêm chi tiết. VD: AI tạo nhà, bạn thêm cây!',
          allowedBlocks: ['ai_generate', 'add_voxel'],
          labelVi: 'Kết hợp'
        }
      ],
      availableBlocks: ['add_voxel', 'remove_voxel', 'paint_voxel', 'ai_generate'],
      tags: ['voxel', 'ai', 'advanced']
    }
  ]
};

export default VOXEL_LESSONS;
