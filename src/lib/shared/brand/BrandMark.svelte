<script lang="ts">
  type Props = { size?: number };
  let { size = 16 }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 32 32"
  fill="none"
  aria-hidden="true"
>
  <g transform="rotate(-7 16 18)" fill="currentColor">
    <path
      d="M16 12
         C 22.5 12, 25 17, 24 22
         C 22 26, 18.5 27.5, 16 27.5
         C 13.5 27.5, 10 26, 8 22
         C 7 17, 9.5 12, 16 12 Z"
    />
    <ellipse cx="16"  cy="5"   rx="2.6" ry="3.6" />
    <ellipse cx="9"   cy="7.5" rx="2.4" ry="3.4"
             transform="rotate(-22 9 7.5)" />
    <ellipse cx="23"  cy="7.5" rx="2.4" ry="3.4"
             transform="rotate(22 23 7.5)" />
    <ellipse cx="4.8" cy="14"  rx="1.8" ry="2.4"
             transform="rotate(-32 4.8 14)" />
  </g>
</svg>
