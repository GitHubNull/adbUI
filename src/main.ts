import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import App from './App.vue';

// PrimeVue Components
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import ProgressBar from 'primevue/progressbar';
import Divider from 'primevue/divider';
import Tooltip from 'primevue/tooltip';

// PrimeVue Styles
import 'primeicons/primeicons.css';

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: 'system',
      cssLayer: false,
    },
  },
});

// Register components globally
app.component('Button', Button);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('Tag', Tag);
app.component('ProgressSpinner', ProgressSpinner);
app.component('ProgressBar', ProgressBar);
app.component('Divider', Divider);

// Register directives
app.directive('tooltip', Tooltip);

app.mount('#app');
