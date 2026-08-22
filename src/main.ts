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
import Toast from 'primevue/toast';
import ToastService from 'primevue/toastservice';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import InputSwitch from 'primevue/inputswitch';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import Dropdown from 'primevue/dropdown';
import Drawer from 'primevue/drawer';
import VirtualScroller from 'primevue/virtualscroller';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

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

app.use(ToastService);

// Register components globally
app.component('Button', Button);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('Tag', Tag);
app.component('ProgressSpinner', ProgressSpinner);
app.component('ProgressBar', ProgressBar);
app.component('Divider', Divider);
app.component('Toast', Toast);
app.component('Dialog', Dialog);
app.component('InputText', InputText);
app.component('SelectButton', SelectButton);
app.component('InputSwitch', InputSwitch);
app.component('InputNumber', InputNumber);
app.component('Slider', Slider);
app.component('Dropdown', Dropdown);
app.component('Drawer', Drawer);
app.component('VirtualScroller', VirtualScroller);
app.component('Tabs', Tabs);
app.component('TabList', TabList);
app.component('Tab', Tab);
app.component('TabPanels', TabPanels);
app.component('TabPanel', TabPanel);

// Register directives
app.directive('tooltip', Tooltip);

app.mount('#app');
