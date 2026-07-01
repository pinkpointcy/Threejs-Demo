# AGENTS 

## 1. 项目概述

本项目是一个基于 **Three.js** 的 3D 渲染项目，采用模块化架构设计，将相机、场景、世界等核心逻辑分离，便于扩展和维护。

### 技术栈
- **核心框架**: Three.js `186dev`（本地库文件方式引入，非 npm）
  - [three.core.js](file:///d:/AGENTS/Agents_Proj_Threejs/three.core.js): 核心底层模块
  - [three.module.js](file:///d:/AGENTS/Agents_Proj_Threejs/three.module.js): ES Module 入口（推荐业务代码直接引用此文件）
- **语言**: JavaScript (ES6+)
- **模块化**: ES Modules (import/export)

---

## 2. 目录结构规范

```
Agents_Proj_Threejs/
├── AGENTS/                  # Agent 配置与文档
│   ├── AGENTS.md           # 本文件：通用要求与规范
│   └── Trae.md             # Trae 特定配置
├── src/                     # 源代码目录
│   ├── core/               # 核心模块
│   │   ├── camera.js       # 相机管理
│   │   ├── scene.js        # 场景管理
│   │   └── world.js        # 世界逻辑（对象组合、交互）
│   ├── test/               # 测试脚本
│   │   ├── test1.js
│   │   └── test2.js
│   └── main.js             # 应用主入口
├── three.core.js           # Three.js 核心底层库（依赖 three.module.js 引用，业务代码不要直接 import）
├── three.module.js         # Three.js ES Module 入口（业务代码统一从此文件 import）
├── .gitignore              # Git 忽略规则
├── README.md               # 项目说明文档
└── VERSION.md              # 版本记录
```

---

## 3. 模块职责划分

### 3.1 核心模块 (`src/core/`)

#### [camera.js](file:///d:/AGENTS/Agents_Proj_Threejs/src/core/camera.js)
- **职责**: 负责相机的创建、配置与控制
- **必须导出**: `createCamera()`、`updateCamera()` 等标准接口
- **包含内容**:
  - 透视相机/正交相机的初始化参数
  - 相机位置、朝向、FOV 等配置
  - 相机控制器（如 OrbitControls）的绑定与更新

#### [scene.js](file:///d:/AGENTS/Agents_Proj_Threejs/src/core/scene.js)
- **职责**: 负责场景、渲染器、光照的初始化与管理
- **必须导出**: `createScene()`、`getRenderer()`、`getScene()` 等接口
- **包含内容**:
  - THREE.Scene 实例创建
  - WebGLRenderer 配置（抗锯齿、像素比、阴影等）
  - 环境光、平行光、点光源等光照系统设置
  - 背景色、雾效等环境配置

#### [world.js](file:///d:/AGENTS/Agents_Proj_Threejs/src/core/world.js)
- **职责**: 组合场景中的 3D 对象，管理世界逻辑与交互
- **必须导出**: `createWorld()`、`updateWorld()`、`disposeWorld()` 等接口
- **包含内容**:
  - 几何体、材质、网格对象的创建与添加
  - 动画逻辑（每帧更新）
  - 用户交互（射线检测 Raycaster、点击/悬停事件）
  - 资源加载与清理（dispose）

### 3.2 主入口 ([main.js](file:///d:/AGENTS/Agents_Proj_Threejs/src/main.js))
- **职责**: 应用启动入口，组装各核心模块并驱动渲染循环
- **必须包含**:
  - 初始化场景、相机、世界
  - requestAnimationFrame 渲染循环
  - 窗口 resize 事件处理
  - DOM 挂载（renderer.domElement 添加到页面）
- **渲染循环标准结构**:
  ```javascript
  function animate() {
    requestAnimationFrame(animate);
    updateWorld();
    updateCamera();
    renderer.render(scene, camera);
  }
  ```

### 3.3 测试模块 (`src/test/`)
- **职责**: 功能验证、调试脚本、示例代码
- 命名规范: `test*.js`
- 每个测试文件应独立可运行，用于验证特定功能模块

---

## 4. 编码规范

### 4.1 通用规则
- **语言**: 统一使用 JavaScript (ES6+)，不引入 TypeScript 除非明确要求
- **模块化**: 所有功能模块必须使用 `export` / `import`，禁止全局变量污染
- **缩进**: 2 空格缩进，不使用 Tab
- **分号**: 语句末尾必须加分号
- **引号**: 优先使用单引号 `'string'`，嵌套时使用双引号
- **命名**:
  - 变量/函数: `camelCase`（小驼峰）
  - 类/构造函数: `PascalCase`（大驼峰）
  - 常量: `UPPER_SNAKE_CASE`
  - 私有成员: `_privateMember`（下划线前缀）

### 4.2 Three.js 特定规范
- **变量前缀约定**:
  - 场景对象: `scene`
  - 相机对象: `camera`
  - 渲染器: `renderer`
  - 网格 Mesh: `mesh*`（如 `meshCube`、`meshFloor`）
  - 几何体: `geometry*`
  - 材质: `material*`
  - 光照: `light*`（如 `lightAmbient`、`lightDir`）
- **资源清理**: 所有动态创建的 Geometry、Material、Texture 必须在 `dispose*()` 方法中显式调用 `.dispose()` 释放内存
- **性能要求**:
  - 避免在渲染循环中创建新对象（几何体、材质等）
  - 大场景优先使用 `BufferGeometry` 而非 `Geometry`
  - 合理设置 `camera.near` / `camera.far` 减少深度冲突
- **尺寸与坐标**:
  - 默认单位: 1 单位 = 1 米
  - 世界坐标 Y 轴朝上（Three.js 默认）
  - 默认渲染尺寸: 跟随 `window.innerWidth` × `window.innerHeight`

### 4.3 Three.js 依赖导入规范
由于 Three.js 以**本地库文件**方式放置在项目根目录（非 npm 包），必须严格遵循以下导入规则：

- **唯一合法导入源**: 所有业务代码**只允许**从 `three.module.js` 导入，**禁止**直接 `import ... from './three.core.js'`
- **相对路径计算**: 根据当前文件所在层级，使用正确数量的 `../` 回退到根目录：
  - `src/main.js` → `import { Scene } from '../three.module.js';`
  - `src/core/*.js` → `import { Scene } from '../../three.module.js';`
  - `src/test/*.js` → `import { Scene } from '../../three.module.js';`
- **导入方式**: 统一使用**具名导入**（named import），禁止命名空间导入：
  - ✅ 正确: `import { Scene, PerspectiveCamera, WebGLRenderer } from '../../three.module.js';`
  - ❌ 错误: `import * as THREE from '../../three.module.js';`（避免无依赖分析的全局命名空间）
- **按需导入**: 只导入当前文件实际使用到的类和常量，保持依赖清晰

### 4.4 模块导出标准模式
每个核心模块建议遵循以下导出模式：
```javascript
// 1. 公共创建函数
export function createXxx(options = {}) { ... }

// 2. 公共更新函数（每帧调用）
export function updateXxx(delta = 0) { ... }

// 3. 公共销毁函数
export function disposeXxx() { ... }

// 4. 公共获取器（需要时）
export function getXxx() { ... }
```

---

## 5. 开发流程要求

### 5.1 新增功能
1. **确定模块归属**: 相机相关 → `camera.js`，场景相关 → `scene.js`，世界对象/交互 → `world.js`
2. **扩展而非修改**: 优先通过新增函数/方法扩展，避免破坏现有导出接口
3. **同步更新入口**: 如新增核心模块，需在 `main.js` 中正确组装到渲染循环

### 5.2 修复问题
1. 先定位问题所属模块
2. 修改后验证：
   - 浏览器控制台无报错
   - 3D 场景正常渲染
   - resize 事件正常响应
   - 交互（如有）正常

### 5.3 代码提交前检查
- [ ] 所有新增变量/函数有合理命名
- [ ] 无未使用的变量、import
- [ ] 渲染循环中无对象内存泄漏
- [ ] dispose 逻辑完善（如有动态资源创建）
- [ ] 代码格式符合本规范

---

## 6. 测试与验证

- 功能验证脚本放置于 `src/test/` 目录
- 每个独立功能点建议配套对应 test 文件
- 测试文件头部注释说明：测试目标、操作步骤、预期结果
- 手动验证通过后方可标记功能完成

---

## 7. 版本管理 (VERSION.md)

所有重要变更必须同步更新 [VERSION.md](file:///d:/AGENTS/Agents_Proj_Threejs/VERSION.md)，格式：

```
# 版本号 YYYY-MM-DD
- 新增/修复/优化: 变更描述
- ...
```

---

## 8. 禁止事项

- 禁止在核心模块中直接操作 DOM（DOM 相关逻辑统一在 `main.js` 处理）
- 禁止在渲染循环内使用 `console.log`（调试后必须移除）
- 禁止硬编码魔法数字，使用常量或配置参数
- 禁止引入与 Three.js 无关的 UI 框架（如 React/Vue）除非明确要求
- 禁止混用 CommonJS (`require`) 与 ES Modules (`import`)
- 禁止业务代码直接 `import ... from 'three.core.js'`（统一从 `three.module.js` 具名导入）
- 禁止使用 `import * as THREE` 的命名空间导入方式（一律按实际用到的类具名导入）
