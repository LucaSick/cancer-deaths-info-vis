const defaultProperties = {
    worlmap_filter: {
        age_name: "All ages",
        cause_name: "Neoplasms",
        year: 1980,
        sex: "both",
        view_type: "Rate"
    }
};

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