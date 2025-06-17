<script setup lang="ts"></script>

<template>
  <div class="header__wrapper">
    <div class="header">
      <NuxtLink
        class="h-1"
        to="/"
      >
        Digital Partners Global
      </NuxtLink>
    </div>
  </div>
</template>

<style lang="scss">
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 92px;
  flex: 1;
  padding: 0 40px;
  box-sizing: border-box;
  max-width: 1440px;

  > a {
    text-decoration: none;
    &.router-link-active,
    &:visited {
      color: var(--text-dark-color);
    }
  }

  &__wrapper {
    box-shadow: 0px 10px 40px 0px #0000001a;
    display: flex;
    justify-content: center;
  }
}
</style>
