<script setup lang="ts">
import VisitorDashboard from '../components/VisitorDashboard.vue'
</script>

<template>
  <div class="view-home">
    <div class="contents">
      <VisitorDashboard />
    </div>
  </div>
</template>

<style scoped>
.view-home {
  padding: var(--vp-layout-padding);
  max-width: var(--vp-layout-max-width);
  margin: 0 auto;
}

.contents {
  position: relative;
  width: min(430px, 100% - 32px);
  margin-left: 128px;
  padding: 100px 0;
}

@media (max-width: 1200px) {
  .contents {
    margin: auto;
  }
}
</style>
