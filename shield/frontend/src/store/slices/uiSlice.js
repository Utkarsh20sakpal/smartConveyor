/**
 * uiSlice.js
 * Manages global UI state: sidebar, AI assistant panel, toasts, notifications.
 */
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sidebarCollapsed:    false,
  aiAssistantOpen:     false,
  activePage:          "dashboard",
  globalRUL:           null,          // Hours — sourced from state.rul.currentRULHours (rulSlice)
  systemStatus:        "ONLINE",     // ONLINE | DEGRADED | OFFLINE
  notificationCount:   3,
  lastUpdated:         null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload;
    },
    openAIAssistant(state) {
      state.aiAssistantOpen = true;
    },
    closeAIAssistant(state) {
      state.aiAssistantOpen = false;
    },
    toggleAIAssistant(state) {
      state.aiAssistantOpen = !state.aiAssistantOpen;
    },
    setActivePage(state, action) {
      state.activePage = action.payload;
    },
    setGlobalRUL(state, action) {
      state.globalRUL = action.payload;
    },
    setSystemStatus(state, action) {
      state.systemStatus = action.payload;
    },
    setNotificationCount(state, action) {
      state.notificationCount = action.payload;
    },
    setLastUpdated(state, action) {
      state.lastUpdated = action.payload;
    },
  },
});

export const {
  toggleSidebar, setSidebarCollapsed,
  openAIAssistant, closeAIAssistant, toggleAIAssistant,
  setActivePage, setGlobalRUL, setSystemStatus,
  setNotificationCount, setLastUpdated,
} = uiSlice.actions;
export default uiSlice.reducer;
