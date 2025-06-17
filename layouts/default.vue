<script setup lang="ts"></script>

<template>
  <div class="layout">
    <div class="layout__body">
      <Header />
      <div class="layout__content">
        <slot />
      </div>
    </div>
    <Footer />
  </div>
</template>

<style lang="scss">
#__nuxt {
  background: var(--background-color);
}

body {
  margin: 0;
}

.layout {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  &__body {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding-bottom: 40px;
    position: relative;
  }
  &__content {
    max-width: 1440px;
    margin: 0 auto;
    flex: 1;
    display: flex;
  }
}
</style>
