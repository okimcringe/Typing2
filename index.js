import {
    name2,
    eventSource,
    event_types,
    isStreamingEnabled,
    saveSettingsDebounced,
} from '../../../../script.js';
import * as stScript from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { selected_group } from '../../../group-chats.js';
import { t } from '../../../i18n.js';

const MODULE = 'typing_indicator';
const legacyIndicatorTemplate = document.getElementById('typing_indicator_template');

/**
 * @typedef {Object} TypingIndicatorSettings
 * @property {boolean} enabled
 * @property {boolean} streaming
 */

/**
 * @type {TypingIndicatorSettings}
 */
const defaultSettings = {
    enabled: false,
    streaming: false,
};

/**
 * Get the settings for this extension.
 * If the settings are not found, the default settings are initialized.
 * @returns {TypingIndicatorSettings} Settings object
 */
function getSettings() {
    if (extension_settings[MODULE] === undefined) {
        extension_settings[MODULE] = structuredClone(defaultSettings);
    }

    for (const key in defaultSettings) {
        if (extension_settings[MODULE][key] === undefined) {
            extension_settings[MODULE][key] = defaultSettings[key];
        }
    }

    return extension_settings[MODULE];
}

/**
 * Draws the settings for this extension.
 * @param {TypingIndicatorSettings} settings Settings object
 * @returns {void}
 */
function addExtensionSettings(settings) {
    const settingsContainer = document.getElementById('typing_indicator_container') ?? document.getElementById('extensions_settings');
    if (!settingsContainer) {
        return;
    }

    const inlineDrawer = document.createElement('div');
    inlineDrawer.classList.add('inline-drawer');
    settingsContainer.append(inlineDrawer);

    const inlineDrawerToggle = document.createElement('div');
    inlineDrawerToggle.classList.add('inline-drawer-toggle', 'inline-drawer-header');

    const extensionName = document.createElement('b');
    extensionName.textContent = t`Typing Indicator`;

    const inlineDrawerIcon = document.createElement('div');
    inlineDrawerIcon.classList.add('inline-drawer-icon', 'fa-solid', 'fa-circle-chevron-down', 'down');

    inlineDrawerToggle.append(extensionName, inlineDrawerIcon);

    const inlineDrawerContent = document.createElement('div');
    inlineDrawerContent.classList.add('inline-drawer-content');

    inlineDrawer.append(inlineDrawerToggle, inlineDrawerContent);

    // Enabled
    const enabledCheckboxLabel = document.createElement('label');
    enabledCheckboxLabel.classList.add('checkbox_label');
    enabledCheckboxLabel.htmlFor = 'typingIndicatorEnabled';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.id = 'typingIndicatorEnabled';
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.addEventListener('change', () => {
        settings.enabled = enabledCheckbox.checked;
        saveSettingsDebounced();
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    // Show if streaming
    const showIfStreamingCheckboxLabel = document.createElement('label');
    showIfStreamingCheckboxLabel.classList.add('checkbox_label');
    showIfStreamingCheckboxLabel.htmlFor = 'typingIndicatorShowIfStreaming';
    const showIfStreamingCheckbox = document.createElement('input');
    showIfStreamingCheckbox.id = 'typingIndicatorShowIfStreaming';
    showIfStreamingCheckbox.type = 'checkbox';
    showIfStreamingCheckbox.checked = settings.streaming;
    showIfStreamingCheckbox.addEventListener('change', () => {
        settings.streaming = showIfStreamingCheckbox.checked;
        saveSettingsDebounced();
    });
    const showIfStreamingCheckboxText = document.createElement('span');
    showIfStreamingCheckboxText.textContent = t`Show if streaming`;
    showIfStreamingCheckboxLabel.append(showIfStreamingCheckbox, showIfStreamingCheckboxText);
    inlineDrawerContent.append(showIfStreamingCheckboxLabel);
}

/**
 * Shows a typing indicator in the chat.
 * @param {string} type Generation type
 * @param {any} _args Generation arguments
 * @param {boolean} dryRun Is this a dry run?
 * @returns {void}
 */
function showTypingIndicator(type, _args, dryRun) {
    const settings = getSettings();
    const noIndicatorTypes = ['quiet', 'impersonate'];

    if (noIndicatorTypes.includes(type) || dryRun) {
        return;
    }

    if (!settings.enabled || !name2 || (!settings.streaming && isStreamingEnabled())) {
        return;
    }

    if (legacyIndicatorTemplate && selected_group && !isStreamingEnabled()) {
        return;
    }

    const svgAnimation = `
        <span class="svg_dots" style="display: inline-block; vertical-align: middle; margin-right: 3px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 30 16" fill="var(--SmartThemeBodyColor)">
                <style>
                    .dot-fade-1 { animation: smoothFade 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s infinite; }
                    .dot-fade-2 { animation: smoothFade 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s infinite; }
                    .dot-fade-3 { animation: smoothFade 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s infinite; }

                    @keyframes smoothFade {
                        0% { opacity: 0.2; }
                        30% { opacity: 1; }
                        60% { opacity: 0.4; }
                        100% { opacity: 0.2; }
                    }
                </style>
                <circle class="dot-fade-1" cx="5" cy="8" r="3" />
                <circle class="dot-fade-2" cx="15" cy="8" r="3" />
                <circle class="dot-fade-3" cx="25" cy="8" r="3" />
            </svg>
        </span>
    `;

    const baseText = t`${name2} is typing...`;
    const htmlContent = `${svgAnimation}${baseText}`;

    const existingIndicator = document.getElementById('typing_indicator');
    if (existingIndicator) {
        const text = existingIndicator.querySelector('.mes_text');
        (text ?? existingIndicator).innerHTML = htmlContent;
        return;
    }

    const chat = document.getElementById('chat');
    if (!chat) {
        return;
    }

    const typingIndicator = buildIndicatorMessage(htmlContent);
    $(typingIndicator).hide();

    const wasChatScrolledDown = Math.ceil(chat.scrollTop + chat.clientHeight) >= chat.scrollHeight;
    chat.appendChild(typingIndicator);
    $(typingIndicator).show(() => {
        if (wasChatScrolledDown) {
            chat.scrollTop = chat.scrollHeight;
        }
    });
}

/**
 * Finds the avatar URL of the character that is about to speak.
 * @returns {string|null} Avatar thumbnail URL, or null if none was found
 */
function getSpeakerAvatarUrl() {
    try {
        const characters = stScript.characters ?? [];
        const character = characters.find(c => c?.name === name2) ?? characters[Number(stScript.this_chid)];
        if (character?.avatar && character.avatar !== 'none' && typeof stScript.getThumbnailUrl === 'function') {
            return stScript.getThumbnailUrl('avatar', character.avatar);
        }
    } catch (error) {
        console.debug('Typing Indicator: could not resolve avatar', error);
    }
    return null;
}

/**
 * Builds a message-shaped element so the indicator sits right under the
 * character's name, exactly where the "..." placeholder would normally be.
 * @param {string} htmlContent Indicator markup (dots + phrase)
 * @returns {HTMLElement} Indicator element
 */
function buildIndicatorMessage(htmlContent) {
    const avatarUrl = getSpeakerAvatarUrl();
    const template = document.querySelector('#message_template .mes');
    let message;

    if (template) {
        message = /** @type {HTMLElement} */ (template.cloneNode(true));
        message.querySelectorAll('.mes_buttons, .mes_edit_buttons, .swipe_left, .swipe_right, .swipes-counter, .mesIDDisplay, .mes_timer, .tokenCounterDisplay, .timestamp, .mes_img_container, .mes_reasoning_details').forEach(el => el.remove());
        message.removeAttribute('mesid');
        message.setAttribute('is_user', 'false');
        message.setAttribute('is_system', 'false');
        message.setAttribute('ch_name', name2);
        const nameText = message.querySelector('.name_text');
        if (nameText) {
            nameText.textContent = name2;
        }
        const avatarImg = message.querySelector('.avatar img');
        if (avatarImg instanceof HTMLImageElement) {
            if (avatarUrl) {
                avatarImg.src = avatarUrl;
            } else {
                avatarImg.closest('.avatar')?.setAttribute('style', 'visibility: hidden;');
            }
        }
        const mesText = message.querySelector('.mes_text');
        if (mesText) {
            mesText.innerHTML = htmlContent;
        }
    } else {
        // Fallback for versions without the message template
        message = document.createElement('div');
        message.classList.add('mes');
        message.setAttribute('is_user', 'false');
        message.innerHTML = `
            <div class="mesAvatarWrapper"><div class="avatar">${avatarUrl ? `<img src="${avatarUrl}">` : ''}</div></div>
            <div class="mes_block">
                <div class="ch_name"><div class="name_text"></div></div>
                <div class="mes_text">${htmlContent}</div>
            </div>`;
        message.querySelector('.name_text').textContent = name2;
    }

    message.id = 'typing_indicator';
    message.classList.add('typing_indicator');
    return message;
}

/**
 * Hides the typing indicator.
 */
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing_indicator');
    if (typingIndicator) {
        $(typingIndicator).hide(() => typingIndicator.remove());
    }
}

(function () {
    const settings = getSettings();
    addExtensionSettings(settings);

    const showIndicatorEvents = [
        event_types.GENERATION_AFTER_COMMANDS,
    ];

    const hideIndicatorEvents = [
        event_types.GENERATION_STOPPED,
        event_types.GENERATION_ENDED,
        event_types.CHAT_CHANGED,
        event_types.MESSAGE_RECEIVED,
        event_types.STREAM_TOKEN_RECEIVED,
    ].filter(Boolean);

    showIndicatorEvents.forEach(e => eventSource.on(e, showTypingIndicator));
    hideIndicatorEvents.forEach(e => eventSource.on(e, hideTypingIndicator));
})();
