# 🎄 Grand Luxury Interactive 3D Christmas Tree

> 一个基于 **React**, **Three.js (R3F)** 和 **AI 手势识别** 的高保真 3D 圣诞树 Web 应用。

这个项目是一个充满魔法特效的交互式圣诞树。由数万个发光粒子、璀璨的魔法球、能量环和彩灯共同组成了一棵奢华的圣诞树。用户可以通过手势控制树的形态（聚合/散开）和视角旋转，体验电影级的视觉盛宴。

## ✨ 核心特性

* **极致视觉体验**：由 15,000+ 个发光粒子组成的树身，配合动态光晕 (Bloom) 和辉光效果，营造梦幻氛围。
* **魔法特效**：300+ 个魔法粒子球、150+ 个发光星星、80+ 个能量环，以及各种圣诞元素装饰。
* **AI 手势控制**：无需鼠标，通过摄像头捕捉手势即可控制树的形态（聚合/散开）和视角旋转。
* **丰富细节**：包含动态闪烁的彩灯、飘落的金银雪花、以及随机分布的圣诞礼物装饰。
* **高度可定制**：通过修改 CONFIG 对象轻松调整所有视觉参数。

## 🛠️ 技术栈

* **框架**: React 18, Vite
* **3D 引擎**: React Three Fiber (Three.js)
* **工具库**: @react-three/drei, Maath
* **后期处理**: @react-three/postprocessing
* **AI 视觉**: MediaPipe Tasks Vision (Google)

## 🚀 快速开始

### 方式一：一键安装脚本（推荐）

#### Mac M芯片用户

在项目根目录下打开终端，运行：

```bash
chmod +x install.sh
./install.sh
```

脚本会自动：
- 检测 Mac M芯片架构
- 检查并安装 Homebrew（如未安装）
- 检查并安装 Node.js（如未安装）
- 安装所有项目依赖
- 验证安装结果

#### Windows 用户

**方法 1：使用批处理脚本（推荐）**

双击 `install.bat` 文件，或在命令行中运行：

```cmd
install.bat
```

**方法 2：使用 PowerShell 脚本**

右键点击 `install.ps1` -> 使用 PowerShell 运行，或在 PowerShell 中运行：

```powershell
.\install.ps1
```

> 如果遇到执行策略错误，运行：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

脚本会自动：
- 检查 Node.js 是否已安装
- 安装所有项目依赖
- 验证安装结果

### 方式二：手动安装

#### 1. 环境准备
确保你的电脑已安装 [Node.js](https://nodejs.org/) (建议 v18 或更高版本)。

#### 2. 安装依赖
在项目根目录下打开终端，运行：
```bash
npm install
```

#### 3. 启动项目
```bash
npm run dev
```

### 🖐️ 手势控制说明
* **本项目内置了 AI 手势识别系统，请站在摄像头前进行操作（屏幕右下角有 DEBUG 按钮可查看摄像头画面）**：

| 手势 | 动作 | 效果 |
|------|------|------|
| 🖐 张开手掌 (Open Palm) | Disperse (散开) | 圣诞树炸裂成漫天飞舞的粒子和特效元素 |
| ✊ 握紧拳头 (Closed Fist) | Assemble (聚合) | 所有元素瞬间聚合成一棵完美的圣诞树 |
| 👋 手掌左右移动 | 旋转视角 | 手向左移，树向左转；手向右移，树向右转 |
| 👋 手掌上下移动 | 俯仰视角 | 手向上移，视角抬高；手向下移，视角降低 |
### ⚙️ 进阶配置
* **如果你熟悉代码，可以在 src/App.tsx 中的 CONFIG 对象里调整更多视觉参数**：
```typescript
const CONFIG = {
  colors: { ... }, // 修改树、灯光、魔法特效的颜色
  counts: {
    foliage: 15000,    // 修改树叶粒子数量 (配置低可能会卡)
    magicOrbs: 300,    // 修改魔法粒子球数量
    stars: 150,        // 修改发光星星数量
    energyRings: 80,  // 修改能量环数量
    elements: 200,     // 修改圣诞元素数量
    lights: 400        // 修改彩灯数量
  },
  tree: { height: 22, radius: 9 }, // 修改树的大小
};
```
### 📄 License
MIT License. Feel free to use and modify for your own holiday celebrations!
### Merry Christmas! 🎄✨

