<script>
	export let data;
</script>

{#if data != null && data.content != null}
	<span class="tooltiptext">{@html data.content}</span>
{/if}
