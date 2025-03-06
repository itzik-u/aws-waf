const API_BASE_URL = 'http://localhost:5000/api';

export const fetchAclsNames = async (region) => {
    try {
        const response = await fetch(`${API_BASE_URL}/waf-acls-names/region/${region}`);        
        return await response.json();
    } catch (err) {
        console.error('Failed to fetch WAF acls names:', err);
        throw err;
    }
};

export const fetchAclDetail = async (region, name) => {
    try {
        const response = await fetch(`${API_BASE_URL}/waf-acl-details/region/${region}/name/${name}`);
        return await response.json();
    } catch (err) {
        console.error('Failed to fetch WAF rules:', err);
        throw err;
    }
};