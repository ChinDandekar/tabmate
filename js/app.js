import { store } from './store.js';
import { homeScreen } from './screens/home.js';
import { scanScreen } from './screens/scan.js';
import { editItemsScreen } from './screens/editItems.js';
import { peopleScreen } from './screens/people.js';
import { assignScreen } from './screens/assign.js';
import { summaryScreen } from './screens/summary.js';
import { settingsScreen } from './screens/settings.js';
import { splitDetailScreen } from './screens/splitDetail.js';

class App {
  constructor() {
    // Current Active Split state
    this.splitState = {
      restaurant: '',
      items: [],
      people: [],
      taxPercent: 8.875,
      tipPercent: 20,
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      total: 0
    };

    // Dictionary of screens
    this.screens = {
      home: homeScreen,
      scan: scanScreen,
      editItems: editItemsScreen,
      people: peopleScreen,
      assign: assignScreen,
      summary: summaryScreen,
      settings: settingsScreen,
      splitDetail: splitDetailScreen
    };

    this.activeScreen = 'home';
  }

  init() {
    // Initialize screens
    Object.keys(this.screens).forEach(key => {
      this.screens[key].init(this);
    });

    // Logo brand button triggers home navigation
    document.getElementById('header-logo-btn').addEventListener('click', () => {
      if (confirm('Cancel current split check and return to home screen?')) {
        this.navigate('home');
      }
    });

    // Verify first run (prompt to settings if owner Venmo is blank)
    const settings = store.getSettings();
    if (!settings.venmo && !settings.zelle) {
      this.navigate('settings');
    } else {
      this.navigate('home');
    }
  }

  /**
   * Router View Toggle Navigator
   */
  navigate(screenKey, param = null) {
    // Hide active screen
    const currentContainer = document.getElementById(`screen-${this.activeScreen}`);
    if (currentContainer) {
      currentContainer.classList.remove('active');
    }

    this.activeScreen = screenKey;

    // Show new screen
    const targetContainer = document.getElementById(`screen-${screenKey}`);
    if (targetContainer) {
      targetContainer.classList.add('active');
    }

    // Update active screen state
    if (this.screens[screenKey].reset) {
      this.screens[screenKey].reset(param);
    }

    // Update Wizard Nav Headers
    this.updateWizardHeaders();

    // Scroll to top
    window.scrollTo(0, 0);
  }

  /**
   * Clears state parameters and opens camera scan flow.
   */
  startNewSplit() {
    this.splitState = {
      restaurant: '',
      items: [],
      people: [],
      taxPercent: 8.875,
      tipPercent: 20,
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      total: 0
    };
    this.navigate('scan');
  }

  /**
   * Navigates to a specific historical split's detail page.
   */
  viewHistoricalSplit(splitId) {
    this.navigate('splitDetail', splitId);
  }

  /**
   * Updates wizard steps highlights dynamically based on current step container.
   */
  updateWizardHeaders() {
    const wizardNav = document.getElementById('wizard-nav');
    const settingsBtn = document.getElementById('home-settings-btn');
    
    const wizardScreens = ['editItems', 'people', 'assign', 'summary'];
    
    if (!wizardScreens.includes(this.activeScreen)) {
      // Hide wizard nav, show settings gear
      wizardNav.style.display = 'none';
      settingsBtn.style.display = 'inline-flex';
      return;
    }

    // Show wizard nav, hide settings gear
    wizardNav.style.display = 'flex';
    settingsBtn.style.display = 'none';

    // Step index keys mapping
    const stepKeys = {
      editItems: 'receipt',
      people: 'people',
      assign: 'assign',
      summary: 'summary'
    };

    const activeStep = stepKeys[this.activeScreen];
    const steps = ['receipt', 'people', 'assign', 'summary'];
    const activeIndex = steps.indexOf(activeStep);

    steps.forEach((step, idx) => {
      const btn = document.getElementById(`nav-step-${step}`);
      if (!btn) return;

      // Reset styling
      btn.className = 'text-xs px-25 py-1 rounded-md transition-colors font-medium ';
      btn.disabled = idx > activeIndex;

      if (step === activeStep) {
        btn.className += 'bg-primary text-primary-foreground';
      } else if (idx < activeIndex) {
        btn.className += 'text-foreground/60 hover:text-foreground hover:bg-muted';
        
        // Add navigation shortcut link back to previous step
        btn.onclick = () => {
          const backMapping = {
            receipt: 'editItems',
            people: 'people',
            assign: 'assign',
            summary: 'summary'
          };
          this.navigate(backMapping[step]);
        };
      } else {
        btn.className += 'text-foreground/30 cursor-default';
        btn.onclick = null;
      }
    });
  }
}

// Instantiate and start app on page load
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
