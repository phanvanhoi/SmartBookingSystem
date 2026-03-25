import { create } from 'zustand'

interface RoomStore {
  selectedRoomId: number | null
  isCheckinOpen: boolean
  isCheckoutOpen: boolean
  isDetailOpen: boolean

  selectRoom: (id: number | null) => void
  openCheckin: (roomId: number) => void
  openCheckout: (roomId: number) => void
  openDetail: (roomId: number) => void
  closeAll: () => void
}

export const useRoomStore = create<RoomStore>((set) => ({
  selectedRoomId: null,
  isCheckinOpen: false,
  isCheckoutOpen: false,
  isDetailOpen: false,

  selectRoom: (id) => set({ selectedRoomId: id }),

  openCheckin: (roomId) =>
    set({
      selectedRoomId: roomId,
      isCheckinOpen: true,
      isCheckoutOpen: false,
      isDetailOpen: false,
    }),

  openCheckout: (roomId) =>
    set({
      selectedRoomId: roomId,
      isCheckoutOpen: true,
      isCheckinOpen: false,
      isDetailOpen: false,
    }),

  openDetail: (roomId) =>
    set({
      selectedRoomId: roomId,
      isDetailOpen: true,
      isCheckinOpen: false,
      isCheckoutOpen: false,
    }),

  closeAll: () =>
    set({
      isCheckinOpen: false,
      isCheckoutOpen: false,
      isDetailOpen: false,
    }),
}))
