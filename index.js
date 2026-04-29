import { saveSettingsDebounced, eventSource, event_types } from "../../../../script.js";
import { getContext } from "../../../extensions.js";

const LIST_ID = 'completion_prompt_manager_list';

function getPromptManager() {
    const ctx = getContext();
    return ctx.promptManager || window.promptManager || null;
}

function getActiveOrder(pm) {
    if (!pm || !pm.activeCharacter) return null;
    const charId = pm.activeCharacter.id;
    const entry = pm.serviceSettings.prompt_order.find(o => o.character_id === charId);
    return entry ? entry.order : null;
}

function addEntryNumbers() {
    const list = document.getElementById(LIST_ID);
    if (!list) return;

    const items = list.querySelectorAll('li.completion_prompt_manager_prompt');
    let visibleIndex = 0;

    items.forEach((li) => {
        // ข้าม header row
        if (li.classList.contains('completion_prompt_manager_list_head')) return;
        if (li.classList.contains('completion_prompt_manager_list_separator')) return;

        visibleIndex++;
        const currentPos = visibleIndex;

        let input = li.querySelector('.entry-number-input');
        if (input) {
            input.value = currentPos;
            return;
        }

        input = document.createElement('input');
        input.type = 'number';
        input.className = 'entry-number-input';
        input.value = currentPos;
        input.min = 1;
        input.title = 'ตำแหน่งของ entry (แก้เลขเพื่อย้าย)';

        // กันไม่ให้ event ไปกระตุ้น drag/click ของ list
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        input.addEventListener('pointerdown', (e) => e.stopPropagation());

        input.addEventListener('change', (e) => {
            e.stopPropagation();
            const newPos = parseInt(e.target.value, 10) - 1;
            const identifier = li.getAttribute('data-pm-identifier');
            if (identifier && !isNaN(newPos)) {
                reorderPrompt(identifier, newPos);
            }
        });

        // วาง input ไว้หน้าสุดของ <li>
        li.insertBefore(input, li.firstChild);
    });
}

function reorderPrompt(identifier, newIndex) {
    const pm = getPromptManager();
    if (!pm) {
        console.error('[PER] PromptManager not found');
        return;
    }

    const order = getActiveOrder(pm);
    if (!order) {
        console.error('[PER] Active prompt order not found');
        return;
    }

    const currentIndex = order.findIndex(p => p.identifier === identifier);
    if (currentIndex === -1) return;

    if (newIndex < 0) newIndex = 0;
    if (newIndex >= order.length) newIndex = order.length - 1;
    if (newIndex === currentIndex) return;

    const [moved] = order.splice(currentIndex, 1);
    order.splice(newIndex, 0, moved);

    // บันทึกและ re-render
    if (typeof pm.saveServiceSettings === 'function') {
        pm.saveServiceSettings().then(() => {
            pm.render();
            setTimeout(addEntryNumbers, 100);
        });
    } else {
        saveSettingsDebounced();
        pm.render();
        setTimeout(addEntryNumbers, 100);
    }
}

function setupObserver() {
    const list = document.getElementById(LIST_ID);
    if (!list) return false;

    const observer = new MutationObserver(() => {
        // debounce เล็กน้อย
        clearTimeout(window.__perDebounce);
        window.__perDebounce = setTimeout(addEntryNumbers, 50);
    });

    observer.observe(list, { childList: true, subtree: true });
    addEntryNumbers();
    return true;
}

jQuery(async () => {
    console.log('[PER] Loading Preset Entry Reordering');

    // รอให้ prompt manager พร้อม
    const checkInterval = setInterval(() => {
        if (document.getElementById(LIST_ID)) {
            clearInterval(checkInterval);
            setupObserver();
        }
    }, 500);

    // hook event ของ ST เผื่อ list ถูก re-render
    if (eventSource && event_types) {
        const refreshEvents = [
            event_types.SETTINGS_UPDATED,
            event_types.CHAT_CHANGED,
            event_types.CHATCOMPLETION_SOURCE_CHANGED,
        ].filter(Boolean);

        refreshEvents.forEach(ev => {
            eventSource.on(ev, () => {
                setTimeout(addEntryNumbers, 200);
            });
        });
    }
});
