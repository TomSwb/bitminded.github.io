/**
 * Personal Info Component
 * Handles date of birth, country, and gender
 */
if (typeof PersonalInfo === 'undefined') {
class PersonalInfo {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.profileData = null;
        this.countries = this.getCountryList();
    }

    async init() {
        try {
            if (this.isInitialized) {
                return;
            }

            await this.loadCurrentUser();
            await this.loadProfileData();
            this.cacheElements();
            this.populateCountryDropdown();
            this.bindEvents();
            this.updateHeaderDisplay();
            
            this.isInitialized = true;
            // Initialized
        } catch (error) {
            console.error('❌ Failed to initialize Personal Info:', error);
        }
    }

    async loadCurrentUser() {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            throw new Error('No user logged in');
        }
        this.currentUser = user;
    }

    async loadProfileData() {
        const { data, error } = await window.supabase
            .from('user_profiles')
            .select('date_of_birth, country, gender')
            .eq('id', this.currentUser.id)
            .single();
        
        if (error) {
            console.error('❌ Failed to load profile data:', error);
            this.profileData = {};
        } else {
            this.profileData = data || {};
        }
    }

    cacheElements() {
        // Main elements
        this.editBtn = document.getElementById('edit-personal-info-btn');
        this.form = document.getElementById('personal-info-form');
        
        // Header display elements (in profile-management header)
        this.headerAgeDisplay = document.getElementById('profile-age');
        this.headerCountryDisplay = document.getElementById('profile-country');
        this.headerGenderDisplay = document.getElementById('profile-gender');
        
        // Form inputs
        this.dobInput = document.getElementById('new-dob');
        this.countrySelect = document.getElementById('new-country');
        this.genderSelect = document.getElementById('new-gender');
        
        // Form buttons
        this.cancelBtn = document.getElementById('cancel-personal-info-btn');
        this.saveBtn = document.getElementById('save-personal-info-btn');
    }

    bindEvents() {
        // Edit button - show form
        if (this.editBtn) {
            this.editBtn.addEventListener('click', () => this.showEditForm());
        }
        
        // Cancel button - hide form
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.hideEditForm());
        }
        
        // Form submit
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // Input changes - validate and enable save button
        if (this.dobInput) {
            this.dobInput.addEventListener('change', () => this.validateForm());
        }
        if (this.countrySelect) {
            this.countrySelect.addEventListener('input', () => this.validateForm());
        }
        if (this.genderSelect) {
            this.genderSelect.addEventListener('change', () => this.validateForm());
        }
    }

    validateForm() {
        // Check if any value has changed
        const dobChanged = this.dobInput.value !== (this.profileData.date_of_birth || '');
        const countryChanged = this.countrySelect.value.trim() !== (this.profileData.country || '');
        const genderChanged = this.genderSelect.value !== (this.profileData.gender || '');
        
        const hasChanges = dobChanged || countryChanged || genderChanged;
        
        // Enable save button only if there are changes
        if (this.saveBtn) {
            this.saveBtn.disabled = !hasChanges;
        }
    }

    updateHeaderDisplay() {
        // Update age in header (just the number)
        if (this.headerAgeDisplay) {
            if (this.profileData.date_of_birth) {
                const age = this.calculateAge(new Date(this.profileData.date_of_birth));
                this.headerAgeDisplay.textContent = `${age}`;
            } else {
                this.headerAgeDisplay.textContent = '';
            }
        }
        
        // Update country in header (with flag emoji)
        if (this.headerCountryDisplay) {
            if (this.profileData.country) {
                const flag = this.getCountryFlag(this.profileData.country);
                this.headerCountryDisplay.textContent = ` • ${flag}`;
            } else {
                this.headerCountryDisplay.textContent = '';
            }
        }
        
        // Update gender in header (colored symbols)
        if (this.headerGenderDisplay) {
            if (this.profileData.gender === 'male') {
                this.headerGenderDisplay.innerHTML = ' • <span style="color: #4A90E2;">♂</span>';
            } else if (this.profileData.gender === 'female') {
                this.headerGenderDisplay.innerHTML = ' • <span style="color: #E91E63;">♀</span>';
            } else {
                this.headerGenderDisplay.textContent = '';
            }
        }
    }

    showEditForm() {
        // Hide button, show form
        if (this.editBtn) this.editBtn.classList.add('hidden');
        if (this.form) this.form.classList.remove('hidden');
        
        // Populate form with current values
        if (this.dobInput && this.profileData.date_of_birth) {
            this.dobInput.value = this.profileData.date_of_birth;
        }
        if (this.countrySelect && this.profileData.country) {
            this.countrySelect.value = this.profileData.country;
        }
        if (this.genderSelect && this.profileData.gender) {
            this.genderSelect.value = this.profileData.gender;
        }
    }

    hideEditForm() {
        // Hide form, show button
        if (this.form) this.form.classList.add('hidden');
        if (this.editBtn) this.editBtn.classList.remove('hidden');
        
        // Reset form
        if (this.form) this.form.reset();
    }

    calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const dobValue = this.dobInput.value || null;
        const countryValue = this.countrySelect.value.trim() || null;
        const genderValue = this.genderSelect.value || null;

        try {
            // Disable save button
            if (this.saveBtn) this.saveBtn.disabled = true;
            
            const { error } = await window.supabase
                .from('user_profiles')
                .update({ 
                    date_of_birth: dobValue,
                    country: countryValue,
                    gender: genderValue
                })
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // Update local data
            this.profileData.date_of_birth = dobValue;
            this.profileData.country = countryValue;
            this.profileData.gender = genderValue;
            
            // Update header display and hide form
            this.updateHeaderDisplay();
            this.hideEditForm();
            
            // Success
        } catch (error) {
            console.error('❌ Failed to update personal info:', error);
            alert('Failed to update personal information. Please try again.');
        } finally {
            if (this.saveBtn) this.saveBtn.disabled = false;
        }
    }

    getCountryList() {
        // Common countries list (can be expanded)
        return [
            'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 
            'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 
            'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 
            'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 
            'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 
            'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 
            'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 
            'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 
            'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 
            'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 
            'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'North Korea', 'South Korea', 
            'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 
            'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 
            'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 
            'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 
            'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 
            'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 
            'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 
            'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 
            'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 
            'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 
            'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 
            'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 
            'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 
            'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
        ];
    }

    populateCountryDropdown() {
        if (!this.countrySelect) return;
        
        // Clear existing options except the first (placeholder)
        while (this.countrySelect.options.length > 1) {
            this.countrySelect.remove(1);
        }
        
        // Add all countries
        this.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            this.countrySelect.appendChild(option);
        });
    }

    getCountryFlag(countryName) {
        // Map country names to flag emojis
        const flagMap = {
            'Switzerland': '🇨🇭', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Germany': '🇩🇪',
            'France': '🇫🇷', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
            'Japan': '🇯🇵', 'China': '🇨🇳', 'India': '🇮🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
            'Argentina': '🇦🇷', 'South Korea': '🇰🇷', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
            'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'Austria': '🇦🇹',
            'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Greece': '🇬🇷', 'Ireland': '🇮🇪', 'New Zealand': '🇳🇿',
            'Singapore': '🇸🇬', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Philippines': '🇵🇭',
            'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾', 'South Africa': '🇿🇦', 'Egypt': '🇪🇬',
            'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'Czech Republic': '🇨🇿',
            'Romania': '🇷🇴', 'Hungary': '🇭🇺', 'Israel': '🇮🇱', 'Saudi Arabia': '🇸🇦',
            'United Arab Emirates': '🇦🇪', 'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Chile': '🇨🇱',
            'Colombia': '🇨🇴', 'Peru': '🇵🇪', 'Venezuela': '🇻🇪', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪',
            'Morocco': '🇲🇦', 'Algeria': '🇩🇿', 'Tunisia': '🇹🇳', 'Lebanon': '🇱🇧', 'Jordan': '🇯🇴',
            'Iraq': '🇮🇶', 'Iran': '🇮🇷', 'Afghanistan': '🇦🇫', 'Sri Lanka': '🇱🇰', 'Nepal': '🇳🇵',
            'Iceland': '🇮🇸', 'Croatia': '🇭🇷', 'Serbia': '🇷🇸', 'Bulgaria': '🇧🇬', 'Slovakia': '🇸🇰',
            'Slovenia': '🇸🇮', 'Lithuania': '🇱🇹', 'Latvia': '🇱🇻', 'Estonia': '🇪🇪',
            'Luxembourg': '🇱🇺', 'Malta': '🇲🇹', 'Cyprus': '🇨🇾', 'Taiwan': '🇹🇼', 'Hong Kong': '🇭🇰'
        };
        
        return flagMap[countryName] || '🌍'; // Default to globe emoji if flag not found
    }
}

// Close the if check and register component
window.PersonalInfo = PersonalInfo;
}
