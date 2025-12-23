<template>
  <div 
    class="radial-menu" 
    :class="`radial-menu--${position}`"
    :style="menuStyles"
  >
    <!-- 隐藏的固定状态checkbox -->
    <input 
      type="checkbox" 
      id="radial-menu-fixed"
      class="radial-menu__fixed-state"
    />
    
    <!-- 菜单容器 -->
    <div class="radial-menu__container">
      <!-- 菜单按钮 -->
      <label 
        for="radial-menu-fixed"
        class="radial-menu__toggle"
      >
        <div class="radial-menu__icon">
          <div class="radial-menu__hamburger"></div>
        </div>
      </label>
      
      <!-- 菜单列表 -->
      <div class="radial-menu__listings">
        <ul class="radial-menu__circle">
          <li 
            v-for="(item, index) in props.items" 
            :key="item.id"
            class="radial-menu__item"
            :style="getItemStyle(index)"
            @click="handleItemClick(item)"
          >
            <div class="radial-menu__placeholder">
              <div class="radial-menu__upside">
                <a 
                  v-if="item.url" 
                  :href="item.url" 
                  class="radial-menu__button"
                  :title="item.title"
                  @click.prevent="() => {}"
                >
                  <i :class="item.icon"></i>
                </a>
                <button
                  v-else
                  class="radial-menu__button"
                  :title="item.title"
                  @click.prevent="handleItemAction(item)"
                >
                  <i :class="item.icon"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      
      <!-- 分页箭头 -->
      <div 
        v-if="showArrows && props.items.length > viewCount"
        class="radial-menu__arrow-container"
      >
        <button
          class="radial-menu__arrow"
          :class="{
            'radial-menu__arrow--up': position === 'top-left',
            'radial-menu__arrow--down': position === 'bottom-right'
          }"
          @click="handleArrowClick"
          :title="arrowTitle"
        >
          <div class="radial-menu__arrow-icon"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface RadialMenuItem {
  id: string
  icon: string
  title: string
  url: string
  action?: () => void
}

interface Props {
  items: RadialMenuItem[]
  itemsPerPage?: number
  backgroundColor?: string
  menuColor?: string
  textColor?: string
  hoverColor?: string
  borderColor?: string
  itemPadding?: number
  padding?: number
  innerRadius?: number
  radius?: number
  animationDuration?: number
  autoCloseOnClick?: boolean
  showArrows?: boolean
  closeOnOutsideClick?: boolean
  position?: 'bottom-right' | 'top-left'
  openOnHover?: boolean
  closeDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 10,
  backgroundColor: '#392338',
  menuColor: '#fff',
  textColor: '#392338',
  hoverColor: '#c1264e',
  borderColor: '#ccc',
  itemPadding: 24,
  padding: 20,
  innerRadius: 200,
  radius: 400,
  animationDuration: 300,
  autoCloseOnClick: true,
  showArrows: true,
  closeOnOutsideClick: true,
  position: 'bottom-right',
  openOnHover: true,
  closeDelay: 300
})

const emit = defineEmits<{
  'item-click': [item: RadialMenuItem]
  'menu-toggle': [isOpen: boolean]
}>()

// 响应式状态
const currentRotation = ref(0)

// 计算属性
const viewCount = computed(() => Math.ceil(props.itemsPerPage / 4))

const totalSteps = computed(() => 
  Math.ceil(props.items.length / viewCount.value)
)

const anglePerItem = computed(() => 
  props.items.length > 0 ? 360 / Math.max(props.items.length, props.itemsPerPage) : 0
)

const anglePerStep = computed(() => 
  viewCount.value * anglePerItem.value
)

const menuStyles = computed(() => ({
  '--background-color': props.backgroundColor,
  '--menu-color': props.menuColor,
  '--text-color': props.textColor,
  '--hover-color': props.hoverColor,
  '--border-color': props.borderColor,
  '--animation-duration': `${props.animationDuration}ms`,
  '--item-padding': `${props.itemPadding}px`,
  '--padding': `${props.padding}px`,
  '--inner-radius': `${props.innerRadius}px`,
  '--radius': `${props.radius}px`,
  '--rotation': `${currentRotation.value}deg`
}))

// 获取菜单项样式
const getItemStyle = (index: number) => {
  const angle = anglePerItem.value
  const skewAngle = -(90 - angle)
  const rotateAngle = props.position === 'top-left' ? 180 - angle * (index+1) : - angle * (index+1)
  
  return {
    transform: `rotate(${rotateAngle}deg) skewY(${skewAngle}deg)`,
    '--item-rotate': `${angle / 2}deg`,
    '--skew-angle': `${-skewAngle}deg`
  }
}

// 事件处理
const handleItemClick = (item: RadialMenuItem) => {
  emit('item-click', item)
  if (props.autoCloseOnClick) {
    // 取消固定，让菜单关闭
    const checkbox = document.getElementById('radial-menu-fixed') as HTMLInputElement
    if (checkbox) {
      checkbox.checked = false
    }
    currentRotation.value = 0
  }
}

const handleItemAction = (item: RadialMenuItem) => {
  if (item.action) {
    item.action()
  }
  handleItemClick(item)
}

const currentStep = computed(() => Math.round(Math.abs(currentRotation.value) / anglePerStep.value) % totalSteps.value)

// 箭头逻辑
const arrowTitle = computed(() => {
  return `${currentStep.value + 1} / ${totalSteps.value}`
})

const handleArrowClick = () => {
  // 循环处理
  if (currentStep.value == totalSteps.value - 1) {
    currentRotation.value = 0
    return ;
  }

  currentRotation.value += anglePerStep.value
}

// 生命周期钩子

// 组件挂载时加载Font Awesome
onMounted(() => {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
  document.head.appendChild(link)
})

onUnmounted(() => {
  // 空
})

// 监听属性变化
watch(() => props.items, () => {
  currentRotation.value = 0
})

defineExpose({
  // 通过 checkbox 和 CSS 来控制菜单状态
})
</script>

<style scoped>
.radial-menu {
  position: fixed;
  width: calc(var(--radius) * 1 + 32px);
  height: calc(var(--radius) * 1);
  z-index: 1000;
  pointer-events: none;
  transition: all var(--animation-duration, 300ms) ease;
}

.radial-menu__fixed-state {
  display: none;
}

.radial-menu--bottom-right {
  bottom: 0;
  right: 0;
}

.radial-menu--top-left {
  top: 0;
  left: 0;
}

.radial-menu--bottom-right .radial-menu__container {
  bottom: var(--padding);
  right: var(--padding);
}

.radial-menu--top-left .radial-menu__container {
  top: var(--padding);
  left: var(--padding);
}

.radial-menu:hover,
.radial-menu__fixed-state:checked ~ .radial-menu__container {
  pointer-events: auto;
}

.radial-menu__fixed-state {
  display: none;
}

.radial-menu__container {
  position: relative;
  pointer-events: none;
}

.radial-menu--open .radial-menu__container {
  pointer-events: auto;
}

.radial-menu__toggle {
  width: var(--inner-radius);
  height: var(--inner-radius);
  top: calc(-1 * var(--inner-radius) / 2);
  left: calc(-1 * var(--inner-radius) / 2);
  position: absolute;
  z-index: 11;
  background-color: var(--menu-color);
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  transition: all var(--animation-duration, 300ms) ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  border: none;
  padding: 0;
}

.radial-menu__toggle:hover {
  transform: scale(1.05);
}

.radial-menu:hover .radial-menu__toggle,
.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__toggle {
  background-color: var(--text-color);
}

.radial-menu__icon {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radial-menu__hamburger {
  width: 20px;
  height: 2px;
  background-color: var(--text-color);
  border-radius: 5px;
  position: relative;
  transition: all var(--animation-duration, 300ms) ease;
}

.radial-menu__hamburger::before,
.radial-menu__hamburger::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--text-color);
  border-radius: 5px;
  transition: all var(--animation-duration, 300ms) ease;
}

.radial-menu__hamburger::before {
  top: -6px;
}

.radial-menu__hamburger::after {
  bottom: -6px;
}

.radial-menu--open .radial-menu__hamburger {
  background-color: transparent;
}

.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__hamburger {
  background-color: transparent;
}
.radial-menu:hover .radial-menu__hamburger {
  background-color: var(--menu-color);
}

.radial-menu:hover .radial-menu__hamburger::before,
.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__hamburger::before {
  background-color: var(--menu-color);
}
.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__hamburger::before {
  top: 0;
  transform: rotate(45deg);
}

.radial-menu:hover .radial-menu__hamburger::after,
.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__hamburger::after {
  background-color: var(--menu-color);
}
.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__hamburger::after {
  bottom: 0;
  transform: rotate(-45deg);
}

.radial-menu__listings {
  width: var(--radius);
  height: var(--radius);
  top: calc(-1 * var(--radius) / 2);
  left: calc(-1 * var(--radius) / 2);
  position: absolute;
  z-index: 10;
  border-radius: 50%;
  transform: scale(0.1) rotate(150deg);
  transition: transform var(--animation-duration, 300ms) ease;
  pointer-events: none;
}

.radial-menu:hover .radial-menu__listings,
.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__listings {
  transform: scale(1) rotate(var(--rotation, 0deg));
  pointer-events: auto;
}

.radial-menu__circle {
  position: relative;
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  background-color: var(--menu-color);
  border-radius: 50%;
  list-style: none;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.radial-menu__item {
  position: absolute;
  top: 0;
  right: 0;
  width: 50%;
  height: 50%;
  transform-origin: 0% 100%;
  background-color: var(--menu-color);
  overflow: hidden;
}

.radial-menu__placeholder {
  position: absolute;
  left: -100%;
  width: 200%;
  height: 200%;
  text-align: center;
  transform: skewY(var(--skew-angle)) rotate(var(--item-rotate, 0deg));
  padding-top: var(--item-padding);
}

.radial-menu__upside {
  transform: rotate(180deg);
}

.radial-menu__button {
  width: 60px;
  height: 60px;
  background-color: var(--menu-color);
  border: none;
  cursor: pointer;
  text-decoration: none;
  color: var(--text-color);
  font-size: 1.5rem;
  transition: all 0.3s ease;
  pointer-events: auto;
}

.radial-menu__button:hover {
  color: var(--hover-color);
}

.radial-menu__arrow-container {
  position: absolute;
  display: block;
  top: -16px;
  left: calc(var(--radius) / 2 + 8px); /* gap */
  pointer-events: auto;
  z-index: 15;
  display: none;
}

.radial-menu-container.position-top-left .radial-menu__arrow-container {
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
}

.radial-menu-container.position-bottom-right .radial-menu__arrow-container {
  bottom: 15%;
  right: 50%;
  transform: translateX(50%);
}

.radial-menu:hover .radial-menu__arrow-container,
.radial-menu__fixed-state:checked ~ .radial-menu__container .radial-menu__arrow-container {
  display: block;
}

.radial-menu__arrow {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 16;
}

.radial-menu__arrow:hover {
  border-color: var(--hover-color);
}

.radial-menu__arrow-icon {
  width: 18px;
  height: 18px;
  position: relative;
}

.radial-menu__arrow--up .radial-menu__arrow-icon::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-top: 2px solid var(--text-color);
  border-right: 2px solid var(--text-color);
  transform: rotate(-45deg) translate(-2px, 2px);
  left: 4.5px;
  top: 4px;
}

.radial-menu__arrow--down .radial-menu__arrow-icon::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-bottom: 2px solid var(--text-color);
  border-left: 2px solid var(--text-color);
  transform: rotate(-45deg) translate(2px, -2px);
  left: 4.5px;
  top: 6px;
}
</style>