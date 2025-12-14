<script setup lang="ts">
</script>

<template>
  <div class="view-home">
    <h1>Home</h1>
    <nav>
      <router-link to="/about">Go to About</router-link>
    </nav>
  </div>
</template>

<style scoped>
.view-home {
  padding: var(--vp-layout-padding);
  max-width: var(--vp-layout-max-width);
  margin: 0 auto;
}

nav {
  margin-top: 1rem;
}

a {
  display: inline-block;
  margin-top: 0.5rem;
}
</style>
