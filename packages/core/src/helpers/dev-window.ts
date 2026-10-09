let mainWindowId: number | null = null;

export const setMainWindowId = (id: number): void => {
    mainWindowId = id;
};

export const cleanMainWindowId = (id: number): void => {
    if (mainWindowId === id) mainWindowId = null;
};

export const getMainWindowId = (): number => {
    if (mainWindowId === null) throw new Error('lepton.dev: main window is not open');

    return mainWindowId;
};
