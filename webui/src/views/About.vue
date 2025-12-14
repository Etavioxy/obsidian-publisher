<script setup lang="ts">
</script>

<template>
  <div class="view-about">
    <h1>About</h1>
    <nav>
      <router-link to="/">Go to Home</router-link>
    </nav>
  </div>
</template>

<style scoped>
.view-about {
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
