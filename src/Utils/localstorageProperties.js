const defaultProperties = {
    worlmap_filter: {
        age_name: "All ages",
        cause_name: "Neoplasms",
        year: 1980,
        sex: "Both",
        view_type: "Rate"
    }
};

// Current filters are put in local storage so they can resume where they left of when they close the map or go to the details
const LocalstorageProperties = {
    getProperties(storageKey) {
        if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, JSON.stringify(defaultProperties[storageKey]));
        }
        return JSON.parse(localStorage.getItem(storageKey));
    },
    setPropreties(storageKey, newProperties) {
        const currentProperties = this.getProperties(storageKey);
        const properties = { ...currentProperties, ...newProperties };
        localStorage.setItem(storageKey, JSON.stringify(properties));
    }
}
export default LocalstorageProperties;