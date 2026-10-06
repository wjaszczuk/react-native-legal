import type { OrPolicy, Types } from '@callstack/licenses';
import { DEFAULT_OR_POLICY } from '@callstack/licenses';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { DependencyType } from '@/types/DependencyType';

type VisualizerStoreState = {
  report: Types.AggregatedLicensesMapping | null;
  reportName?: string;
  orPolicy: OrPolicy;
  loadedAt?: Date;
  visibleDependencyTypes: DependencyType[];
  autoLoadFromServer: boolean;
  selectedRoot: Types.License | null;
  hoveredLicense: Types.License | null;
};

type VisualizerStoreActions = {
  setReport: (report: Types.AggregatedLicensesMapping, reportName: string, orPolicy?: OrPolicy) => void;
  toggleDependencyTypeVisibility: (dependencyType: DependencyType) => void;
  setAutoLoadFromServer: (autoLoadFromServer: boolean) => void;
  selectRoot: (root: Types.License | null) => void;
  setHoveredLicense: (license: Types.License | null) => void;
};

export type VisualizerStore = VisualizerStoreState & VisualizerStoreActions;

export const useVisualizerStore = create<VisualizerStore>()(
  immer((set) => ({
    report: null,
    setReport: (report, reportName, orPolicy) =>
      set((state) => {
        state.report = report;
        state.reportName = reportName;
        // a report without a policy (e.g. an uploaded file) keeps the policy `visualize` was launched with
        state.orPolicy = orPolicy ?? state.orPolicy;
        state.loadedAt = new Date();
      }),

    reportName: undefined,
    orPolicy: DEFAULT_OR_POLICY,

    visibleDependencyTypes: [
      DependencyType.DEPENDENCY,
      DependencyType.DEV_DEPENDENCY,
      DependencyType.OPTIONAL_DEPENDENCY,
    ],
    toggleDependencyTypeVisibility: (dependencyType) =>
      set((state) => {
        state.visibleDependencyTypes = state.visibleDependencyTypes.includes(dependencyType)
          ? state.visibleDependencyTypes.filter((type) => type !== dependencyType)
          : [...state.visibleDependencyTypes, dependencyType];
      }),

    autoLoadFromServer: false,
    setAutoLoadFromServer: (autoLoadFromServer) => set({ autoLoadFromServer }),

    selectedRoot: null,
    selectRoot: (root) => set({ selectedRoot: root }),

    hoveredLicense: null,
    setHoveredLicense: (license) => set({ hoveredLicense: license }),
  })),
);
