import core from '@grakkit/stdlib-paper'
import type { obiItemStack, obePlayer, obMaterial } from '@grakkit/types-paper'

const Sound = core.type('org.bukkit.Sound')
const ItemStack = core.type('org.bukkit.inventory.ItemStack')
const NamespacedKey = core.type('org.bukkit.NamespacedKey')
const PersistentDataType = core.type('org.bukkit.persistence.PersistentDataType')
const Material = core.type('org.bukkit.Material')

const MAX_INVENTORY_COL = 9
const soundKeys = Object.keys(Sound)
const materialKeys = Object.keys(Material)

// @ts-expect-error
const StringPDT = PersistentDataType.STRING

const config = {
  rows: 5,
}

function estimateMaterial(soundKey: string) {
  let mat = materialKeys.find((e) => soundKey.includes(e))

  if (soundKey.includes('CROSSBOW')) mat = 'CROSSBOW'

  // fixes bad instances
  switch (mat) {
    case 'BUBBLE_COLUMN':
    case 'WATER': {
      mat = 'WATER_BUCKET'
      break
    }
    case 'FIRE':
    case 'LAVA': {
      mat = 'LAVA_BUCKET'
      break
    }
    case 'END_PORTAL':
    case 'END_GATEWAY': {
      mat = 'END_PORTAL_FRAME'
      break
    }
    case 'TRIPWIRE': {
      mat = 'STRING'
      break
    }
    case 'SWEET_BERRY_BUSH': {
      mat = 'SWEET_BERRIES'
      break
    }
  }

  return mat ? Material.getMaterial(mat) : Material.STICK
}

function setCustomData(item: obiItemStack, object: Record<string, any>) {
  const keys = Object.keys(object).sort((a, b) => {
    if (a > b) return 1
    if (a < b) return -1
    return 0
  })
  const meta = item.getItemMeta()
  const container = meta.getPersistentDataContainer()

  container.set(
    new NamespacedKey(core.plugin, 'keys'),
    StringPDT,
    JSON.stringify(keys.map((e) => [e, typeof object[e]]))
  )

  keys.forEach((e) =>
    container.set(new NamespacedKey(core.plugin, e), StringPDT, object[e].toString())
  )

  item.setItemMeta(meta)
}

function getCustomDataCurry<D = Record<string, any>>() {
  return function getCustomData<T extends D>(item: obiItemStack): T | undefined {
    const container = item.getItemMeta().getPersistentDataContainer()
    const rawKeys: string | undefined = container.get(
      new NamespacedKey(core.plugin, 'keys'),
      StringPDT
    )

    if (!rawKeys) return

    const keys = JSON.parse(rawKeys) as string[]
    const output: any = {}
    keys.forEach(([key, primitiveType]) => {
      output[key] = container.get(new NamespacedKey(core.plugin, key), StringPDT)

      switch (primitiveType) {
        case 'boolean': {
          output[key] = Boolean(output[key])
          break
        }

        case 'number': {
          // Hopefully it ain't a float
          output[key] = parseInt(output[key])
          break
        }
      }
    })

    return output
  }
}

const getCustomFlags = getCustomDataCurry<ItemFlags>()

interface ItemFlags {
  menu?: boolean
  soundKey?: string
  offset?: number
  action?: 'StopSound'
  filterString?: string
  pitch?: number
}

/**
 * SoundBrowser is a simple implementation showcasing a list of sounds inside
 * an GUI for Minecraft. This will allow you to play any sound at any pitch.
 *
 * To initialize, make sure to import SoundBrowser and run
 * `SoundBrowser.initialize()`.
 */
export class SoundBrowser {
  static isActive: boolean = false
  static isPlaying: boolean = false

  /**
   * This will initialize the SoundViewer by initializing associated commands and events.
   */
  static initialize = () => {
    this.initializeCommands()
    this.initializeEvents()
    this.isActive = true
  }

  private static initializeCommands = () => {
    core.command({
      name: 'soundbrowser',
      execute: (sender, filterString = '') => {
        if (sender.getName() === 'CONSOLE') return

        const player = core.server.getPlayer(sender.getName())
        player.openInventory(this.createInventory(0, filterString))
      },
      tabComplete: (sender, filterString) => {
        return soundKeys.filter((e) => e.includes(filterString.toUpperCase()))
      },
    })
  }

  private static initializeEvents = () => {
    core.event('org.bukkit.event.inventory.InventoryClickEvent', (event) => {
      const item = event.getCurrentItem()
      if (!item) return

      const data = getCustomFlags(item)
      const player = event.getWhoClicked() as unknown as obePlayer

      if (!data) return
      if (!data.menu) return

      event.setCancelled(true)

      if (data.soundKey) {
        player.playSound(
          player.getLocation(),
          // @ts-expect-error
          Sound[data.soundKey],
          10,
          data.pitch ?? 1
        )

        return
      }

      if (typeof data.offset === 'number') {
        player.openInventory(this.createInventory(data.offset, data.filterString ?? ''))
      }

      if (typeof data.offset === 'number') {
        player.openInventory(this.createInventory(data.offset, data.filterString ?? '', data.pitch))
      }

      if (!!data.action) {
        switch (data.action) {
          case 'StopSound': {
            for (const sound of Sound.values()) {
              player.stopSound(sound)
            }

            break
          }
        }
      }
    })
  }

  private static createInventory = (
    offset: number = 0,
    filterString: string,
    pitch: number = 1
  ) => {
    const size = config.rows * MAX_INVENTORY_COL
    const inventory = core.server.createInventory(undefined as any, size)
    const maxPageSize = size - MAX_INVENTORY_COL
    const filteredSounds = soundKeys.filter((e) => e.includes(filterString.toUpperCase()))

    const maxPage = Math.round(filteredSounds.length / maxPageSize)

    for (let i = 0; i < size - MAX_INVENTORY_COL; i++) {
      let index = i + offset * maxPageSize
      if (!filteredSounds[index]) break

      const soundKey = filteredSounds[index]
      try {
        inventory.setItem(
          i,
          createMenuItem({
            displayName: `${index}: ${soundKey}`,
            customData: {
              soundKey,
              pitch,
            },
            material: estimateMaterial(soundKey),
          })
        )
      } catch (err) {
        console.log(`${i} ${soundKey} failed.`)
      }
    }

    const actionRow = size - MAX_INVENTORY_COL

    // Next Page
    if (offset + 1 <= maxPage) {
      inventory.setItem(
        actionRow + (MAX_INVENTORY_COL - 1),
        createMenuItem({
          displayName: 'Next Page',
          customData: {
            offset: offset + 1,
            filterString,
            pitch: pitch,
          },
          material: Material.ARROW,
        })
      )
    }

    // Prev Page
    if (offset > 0) {
      inventory.setItem(
        actionRow,
        createMenuItem({
          displayName: 'Previous Page',
          customData: {
            offset: offset - 1,
            filterString,
            pitch: pitch,
          },
          material: Material.OAK_BUTTON,
        })
      )
    }

    // Stop Sound
    inventory.setItem(
      actionRow + 1,
      createMenuItem({
        displayName: 'Stop Sound',
        customData: {
          action: 'StopSound',
        },
        material: Material.BARRIER,
      })
    )

    // Current Page
    inventory.setItem(
      actionRow + 7,
      createMenuItem({
        displayName: 'Current Page',
        customData: {},
        lore: [`${offset + 1}/${maxPage + 1}`],
        material: Material.RED_STAINED_GLASS,
      })
    )

    // -Pitch
    if (pitch > 0) {
      inventory.setItem(
        actionRow + 3,
        createMenuItem({
          displayName: '-Pitch',
          customData: {
            offset,
            filterString,
            pitch: pitch - 1,
          },
          lore: [`${pitch}`],
          material: Material.RED_WOOL,
        })
      )
    }

    // +Pitch
    if (pitch < 10)
      inventory.setItem(
        actionRow + 4,
        createMenuItem({
          displayName: '+Pitch',
          customData: {
            offset,
            filterString,
            pitch: pitch + 1,
          },
          lore: [`${pitch}`],
          material: Material.GREEN_WOOL,
        })
      )

    return inventory
  }
}

interface MenuItemOptions {
  displayName: string
  customData: Partial<ItemFlags>
  material: obMaterial
  lore?: string[]
}

function createMenuItem({ displayName, customData, material, lore }: MenuItemOptions) {
  const item = new ItemStack(material)

  setCustomData(item, {
    ...customData,
    menu: true,
  })

  const meta = item.getItemMeta()
  meta.setDisplayName(displayName)

  if (lore) {
    // @ts-expect-error
    meta.setLore(lore)
  }

  item.setItemMeta(meta)

  return item
}
