<style>
   .svlt-grid-container {
    position: relative;
    overflow-y: auto; /* Enable vertical scrolling */
    display: flex; /* Ensure items are laid out vertically */
    flex-direction: column; /* Align items in a column for horizontal scrolling */
    flex-wrap: nowrap; /* Prevent items from wrapping to the next row */
    height: 100vh;
  }
</style>

<svelte:window on:keydown|preventDefault={handleKeyDown} on:keyup|preventDefault={handleKeyUp} />

<div class="svlt-grid-container" style:width={"8000px"} bind:this={container}>
  {#if xPerPx || !fastStart}
    {#each items as item, i (item.id)}
      <MoveResize
        on:repaint={handleRepaint}
        on:pointerup={pointerup}
        id={item.id}
        resizable={item[getComputedRows] && item[getComputedRows].resizable}
        draggable={item[getComputedRows] && item[getComputedRows].draggable}
        {xPerPx}
        {yPerPx}
        width={(item[getComputedRows] && item[getComputedRows].w) * xPerPx - gapX * 2}
        height={Math.min(getComputedRows, item[getComputedRows] && item[getComputedRows].h) * yPerPx - gapY * 2}
        left={(item[getComputedRows] && item[getComputedRows].x) * xPerPx + gapX}
        top={(item[getComputedRows] && item[getComputedRows].y) * yPerPx + gapY}
        item={item[getComputedRows]}
        min={item[getComputedRows] && item[getComputedRows].min}
        max={item[getComputedRows] && item[getComputedRows].max}
        rows={getComputedRows}
        {gapX}
        {gapY}
        {sensor}
        container={scroller}
        nativeContainer={container}
        let:resizePointerDown
        let:movePointerDown>
        {#if item[getComputedRows]}
          <slot {movePointerDown} {resizePointerDown} dataItem={item} item={item[getComputedRows]} index={i} />
        {/if}
      </MoveResize>
    {/each}
  {/if}
</div>


<script>
  import { getContainerWidth } from "./utils/container.js"; // Ensure this utility is created for calculating width
  import {
    moveItemsAroundItem,
    moveItem,
    getItemById,
    specifyUndefinedRows, // This needs to be implemented based on horizontal layout
    findFreeSpaceForItem,
    placeItems,
  } from "./utils/item.js";
  import { onMount, createEventDispatcher } from "svelte";
  import { writable } from 'svelte/store';
  import { getRow, getColsCount, throttle } from "./utils/other.js"; // Ensure getRow and getColumnsCount are adapted for horizontal
  import { makeMatrixFromItems } from "./utils/matrix.js";
  import MoveResize from "./MoveResize/index.svelte";

  const dispatch = createEventDispatcher();

  export let fillSpace = false;
  export let items;
  export let rowHeight;
  export let rows;
  export let gap = [10, 10];
  export let fastStart = false;
  export let throttleUpdate = 100;
  export let throttleResize = 100;

  export let scroller = undefined;
  export let sensor = 20;

  let getComputedRows;

  let container;
  const commandKeyDown = writable(false)

  $: if ($commandKeyDown) {
    console.log('Command key is down');
  } else {
    console.log('Command key is not down');
  }


  $: [gapX, gapY] = gap;

  let xPerPx = rowHeight;
  let yPerPx = 0;

  let containerHeight;

  let containerWidth;
  $: containerWidth = getContainerWidth(items, xPerPx, getComputedRows); // Calculate the container's width based on items

  const pointerup = (ev) => {
    dispatch("pointerup", { id: ev.detail.id, rows: getComputedRows });
  };

  const onResize = throttle(() => {
    items = specifyUndefinedRows(items, getComputedRows, rows); // Adjust for horizontal layout
    dispatch("resize", {
      rows: getComputedRows,
      xPerPx,
      yPerPx,
      height: containerHeight,
    });
  }, throttleUpdate);

  const handleKeyDown = (e) => {
    commandKeyDown.set(e.metaKey)
  }

  const handleKeyUp = (e) => {
    commandKeyDown.set(false)
  }

  onMount(() => {
    const sizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        let height = entries[0].contentRect.height;

        if (height === containerHeight) return;

        getComputedRows = getRow(height, rows); // Adjust for the horizontal layout

        yPerPx = height / getComputedRows;

        if (!containerHeight) {
          items = specifyUndefinedRows(items, getComputedRows, rows);

          dispatch("mount", {
            rows: getComputedRows,
            xPerPx,
            yPerPx,
          });
        } else {
          onResize();
        }

        containerHeight = height;
      });
    });

    sizeObserver.observe(container);

    return () => sizeObserver.disconnect();
  });

  const updateMatrix = ({ detail }) => {
    let activeItem = getItemById(detail.id, items);

    if (activeItem) {
      activeItem = {
        ...activeItem,
        [getComputedRows]: {
          ...activeItem[getComputedRows],
          ...detail.shadow,
        },
      };

      if (fillSpace) {
        items = moveItemsAroundItem(activeItem, items, getComputedRows, getItemById(detail.id, items));
      } else {
        items = moveItem(activeItem, items, getComputedRows, getItemById(detail.id, items), $commandKeyDown, detail);
        console.log("MOVED ITEMS", items)
      }

      if (detail.onUpdate) detail.onUpdate();

      dispatch("change", {
        unsafeItem: activeItem,
        id: activeItem.id,
        rows: getComputedRows,
      });
    }
  };

  const throttleMatrix = throttle(updateMatrix, throttleResize);

  const handleRepaint = ({ detail }) => {
    if (!detail.isPointerUp) {
      throttleMatrix({ detail });
    } else {
      let activeItem = getItemById(detail.id, items);
      items = placeItems(activeItem, items, 6)

      console.log("NEWITEMS", items)

      if (detail.onUpdate) detail.onUpdate();

      dispatch("change", {
        unsafeItem: activeItem,
        id: activeItem.id,
        rows: getComputedRows,
      });
    }
  };
</script>
