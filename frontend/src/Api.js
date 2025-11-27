export const login = async (data) => {
    const response = await fetch(`${process.env.REACT_APP_API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return await response.json();
};
