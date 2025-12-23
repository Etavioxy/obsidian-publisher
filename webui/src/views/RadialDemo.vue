<template>
  <div class="demo-container">
    <div class="demo-header">
      <h1>圆形径向菜单演示</h1>
      <div class="demo-controls">
        <label>
          <input type="checkbox" v-model="openOnHover" />
          悬停打开
        </label>
        <label>
          <input type="checkbox" v-model="showArrows" />
          显示箭头
        </label>
        <label>
          <input type="checkbox" v-model="autoCloseOnClick" />
          点击后关闭
        </label>
        <select v-model="selectedPosition">
          <option value="bottom-right">右下角</option>
          <option value="top-left">左上角</option>
        </select>
        <input 
          type="range" 
          v-model="radius" 
          min="100" 
          max="600" 
          step="10" 
        />
        <input 
          type="range" 
          v-model="innerRadius" 
          min="100" 
          max="300" 
          step="10" 
        />
        <span>半径: {{ radius }}px</span>
        <span>内半径: {{ innerRadius }}px</span>
      </div>
    </div>

    <div class="demo-content">
      <div class="demo-info">
        <h2>菜单项配置</h2>
        <div class="demo-items">
          <div 
            v-for="(item, index) in menuItems" 
            :key="item.id"
            class="demo-item"
          >
            <span>{{ index + 1 }}. {{ item.title }}</span>
            <i :class="item.icon"></i>
          </div>
        </div>
        
        <div class="demo-actions">
          <button @click="addMenuItem">添加菜单项</button>
          <button @click="removeMenuItem">移除菜单项</button>
          <button @click="showToast = true">触发操作</button>
        </div>
      </div>

      <div class="demo-visualization">
        <h2>实时预览</h2>
        <div class="visualization-container">
          <RadialMenu
            :items="menuItems"
            :items-per-page="itemsPerPage"
            :backgroundColor="backgroundColor"
            :menuColor="menuColor"
            :iconColor="iconColor"
            :iconHoverColor="iconHoverColor"
            :arrowHoverColor="arrowHoverColor"
            :innerRadius="innerRadius"
            :radius="radius"
            :animationDuration="animationDuration"
            :autoCloseOnClick="autoCloseOnClick"
            :showArrows="showArrows"
            :closeOnOutsideClick="true"
            :position="selectedPosition"
            :openOnHover="openOnHover"
            @item-click="handleItemClick"
            @menu-toggle="handleMenuToggle"
          />
        </div>
      </div>
    </div>

    <div v-if="showToast" class="demo-toast">
      菜单项被点击: {{ lastClickedItem?.title }}
      <button @click="showToast = false">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RadialMenu from '../components/RadialMenu.vue'

// 菜单配置
const menuItems = ref([
  { id: '1', icon: 'fa fa-user', title: '用户', url: '#' },
  { id: '2', icon: 'fa fa-cog', title: '设置', url: '#' },
  { id: '3', icon: 'fa fa-commenting', title: '消息', url: '#' },
  { id: '4', icon: 'fa fa-trash', title: '删除', url: '#' },
  { id: '5', icon: 'fa fa-battery-full', title: '电池', url: '#' },
  { id: '6', icon: 'fa fa-calendar', title: '日历', url: '#' },
  { id: '7', icon: 'fa fa-cloud', title: '云存储', url: '#' },
  { id: '8', icon: 'fa fa-wifi', title: 'WiFi', url: '#' },
  { id: '9', icon: 'fa fa-envelope', title: '邮件', url: '#' },
  { id: '10', icon: 'fa fa-heart', title: '喜欢', url: '#' },
  { id: '11', icon: 'fa fa-star', title: '收藏', url: '#' },
  { id: '12', icon: 'fa fa-camera', title: '相机', url: '#' },
  { id: '13', icon: 'fa fa-music', title: '音乐', url: '#' },
  { id: '14', icon: 'fa fa-video', title: '视频', url: '#' },
  { id: '15', icon: 'fa fa-gamepad', title: '游戏', url: '#' }
])

// 配置选项
const itemsPerPage = ref(10)
const backgroundColor = ref('#392338')
const menuColor = ref('#fff')
const iconColor = ref('#392338')
const iconHoverColor = ref('#c1264e')
const arrowHoverColor = ref('#ff947f')
const innerRadius = ref(200)
const radius = ref(400)
const animationDuration = ref(300)
const autoCloseOnClick = ref(true)
const showArrows = ref(true)
const selectedPosition = ref<'bottom-right' | 'top-left'>('top-left')
const openOnHover = ref(true)

// 状态
const showToast = ref(false)
const lastClickedItem = ref<any>(null)
let itemCounter = 16

// 事件处理
const handleItemClick = (item: any) => {
  console.log('菜单项点击:', item)
  lastClickedItem.value = item
  showToast.value = true
  
  // 3秒后自动关闭提示
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const handleMenuToggle = (isOpen: boolean) => {
  console.log('菜单状态:', isOpen ? '打开' : '关闭')
}

const addMenuItem = () => {
  const icons = [
    'fa fa-bell',
    'fa fa-home',
    'fa fa-search',
    'fa fa-download',
    'fa fa-upload',
    'fa fa-share',
    'fa fa-print',
    'fa fa-save',
    'fa fa-edit',
    'fa fa-chart-bar'
  ]
  const icon = icons[Math.floor(Math.random() * icons.length)] || 'fa fa-circle'
  menuItems.value.push({
    id: (itemCounter++).toString(),
    icon: icon,
    title: `菜单项 ${itemCounter}`,
    url: '#'
  })
}

const removeMenuItem = () => {
  if (menuItems.value.length > 3) {
    menuItems.value.pop()
  }
}
</script>

<style scoped>
.demo-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.demo-header h1 {
  margin: 0 0 20px 0;
  font-size: 2.5rem;
  background: linear-gradient(45deg, #ff6b6b, #ffd166);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.demo-controls {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.demo-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.demo-controls label:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.demo-controls select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.demo-controls select:focus {
  outline: none;
  border-color: #ff947f;
  box-shadow: 0 0 0 3px rgba(255, 148, 127, 0.3);
}

.demo-controls input[type="range"] {
  width: 150px;
  height: 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.demo-controls input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff947f;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.demo-controls input[type="range"]:hover::-webkit-slider-thumb {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.demo-controls span {
  font-weight: 500;
  color: #ffd166;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.demo-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.demo-info {
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.demo-info h2 {
  margin-top: 0;
  color: #ffd166;
  text-align: center;
  font-size: 1.8rem;
  margin-bottom: 20px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.demo-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 30px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.demo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  border-left: 4px solid #ff947f;
}

.demo-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.demo-item i {
  color: #ff947f;
  font-size: 1.2rem;
  text-shadow: 0 0 10px rgba(255, 148, 127, 0.5);
}

.demo-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.demo-actions button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(45deg, #ff6b6b, #ff947f);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

.demo-actions button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(255, 107, 107, 0.4);
  background: linear-gradient(45deg, #ff5252, #ff7b6b);
}

.demo-actions button:active {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(255, 107, 107, 0.4);
}

.demo-visualization {
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.demo-visualization h2 {
  color: #ffd166;
  font-size: 1.8rem;
  margin-bottom: 20px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.visualization-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  position: relative;
  overflow: hidden;
  border-radius: 15px;
  background: linear-gradient(135deg, rgba(57, 35, 56, 0.8), rgba(76, 0, 102, 0.8));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.visualization-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(255, 148, 127, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(193, 38, 78, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.demo-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px 25px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 15px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s ease;
  z-index: 1001;
}

.demo-toast button {
  background: #ff947f;
  color: white;
  border: none;
  padding: 5px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.demo-toast button:hover {
  background: #ff7b6b;
  transform: scale(1.05);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .demo-content {
    grid-template-columns: 1fr;
  }
  
  .demo-header h1 {
    font-size: 2rem;
  }
  
  .demo-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .demo-container {
    padding: 10px;
  }
  
  .demo-content {
    padding: 10px;
  }
  
  .demo-info,
  .demo-visualization {
    padding: 20px;
  }
  
  .visualization-container {
    height: 300px;
  }
}
</style>