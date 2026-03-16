import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

interface MessageSelectionState {
  selectedMessageIds: string[];
}

const initialState: MessageSelectionState = {
  selectedMessageIds: [],
};

const messageSelectionSlice = createSlice({
  name: 'messageSelection',
  initialState,
  reducers: {
    toggleMessageSelection(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.selectedMessageIds.indexOf(id);
      if (idx === -1) {
        state.selectedMessageIds.push(id);
      } else {
        state.selectedMessageIds.splice(idx, 1);
      }
    },
    selectAllMessages(state, action: PayloadAction<string[]>) {
      state.selectedMessageIds = [...action.payload];
    },
    clearSelection(state) {
      state.selectedMessageIds = [];
    },
  },
});

export const { toggleMessageSelection, selectAllMessages, clearSelection } =
  messageSelectionSlice.actions;

export const selectSelectedMessageIds = (state: RootState) =>
  state.messageSelection.selectedMessageIds;

export const selectIsMultiSelectMode = (state: RootState) =>
  state.messageSelection.selectedMessageIds.length > 0;

export default messageSelectionSlice.reducer;
