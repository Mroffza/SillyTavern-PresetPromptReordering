import { saveSettingsDebounced } from "../../../../script.js";
import { extension_settings, getContext } from "../../../extensions.js";

const extensionName = "preset-entry-reordering";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

function addEntryNumbers() {
    const entryElements = document.querySelectorAll('.world_entry');

    entryElements.forEach((entryEl, index) => {
        if (entryEl.querySelector('.entry-number-input')) return;

        const entryHeader = entryEl.querySelector('.world_entry_form_header');
        if (!entryHeader) return;

        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.className = 'entry-number-input text_pole';
        numberInput.value = index + 1;
        numberInput.min = 1;
        numberInput.style.width = '60px';
        numberInput.style.marginRight = '10px';
        numberInput.title = 'Entry position (change to reorder)';

        numberInput.addEventListener('change', (e) => {
            handleEntryReorder(entryEl, parseInt(e.target.value) - 1);
        });

        entryHeader.insertBefore(numberInput, entryHeader.firstChild);
    });
}

function handleEntryReorder(entryElement, newIndex) {
    const context = getContext();
    const worldInfo = context.worldInfoData;

    if (!worldInfo || !worldInfo.entries) return;

    const entryUid = entryElement.getAttribute('data-uid');
    if (!entryUid) return;

    const currentIndex = worldInfo.entries.findIndex(e => e.uid === parseInt(entryUid));
    if (currentIndex === -1) return;

    if (newIndex < 0) newIndex = 0;
    if (newIndex >= worldInfo.entries.length) newIndex = worldInfo.entries.length - 1;

    const [movedEntry] = worldInfo.entries.splice(currentIndex, 1);
    worldInfo.entries.splice(newIndex, 0, movedEntry);

    saveSettingsDebounced();
    refreshEntryList();
}

function refreshEntryList() {
    const context = getContext();
    if (context.worldInfoGrid) {
        context.worldInfoGrid.refresh();
    }
    setTimeout(() => addEntryNumbers(), 100);
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            const hasEntries = Array.from(mutation.addedNodes).some(node =>
                node.classList && (node.classList.contains('world_entry') ||
                node.querySelector && node.querySelector('.world_entry'))
            );

            if (hasEntries) {
                setTimeout(() => addEntryNumbers(), 50);
                break;
            }
        }
    }
});

jQuery(async () => {
    console.log('Loading Preset Entry Reordering extension');

    const checkInterval = setInterval(() => {
        const worldInfoContainer = document.querySelector('#world_info');
        if (worldInfoContainer) {
            clearInterval(checkInterval);
            observer.observe(worldInfoContainer, {
                childList: true,
                subtree: true
            });
            addEntryNumbers();
        }
    }, 500);
});
