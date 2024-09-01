import React, { useEffect, useRef, useState } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { CodemirrorBinding } from 'y-codemirror';
import * as Y from 'yjs';
import RandomColor from 'randomcolor';
import CodeMirror from 'codemirror';
import './editor.css';
import 'codemirror/lib/codemirror.css';
import "codemirror/mode/python/python";
import 'codemirror/theme/material-darker.css'; // Dark theme
import 'codemirror/theme/eclipse.css'; // Light theme 




const CooperativeEditor = React.memo(function CooperativeEditor(props) {
  const { roomName, isPlayer1, userId, questionId, onChange, questionDeclaration, darkMode } = props;

  // Refs for managing editor state and connections
  const editorRef = useRef(null);
  const cmInstanceRef = useRef(null);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const colorRef = useRef(RandomColor({ luminosity: 'dark' }));
  const initializedRef = useRef(false);
  const questionIdRef = useRef(null);

  // State for managing editor theme
  const [theme, setTheme] = useState(darkMode ? 'material-darker' : 'eclipse');

  useEffect(() => {
    // Initialize CodeMirror instance and set up collaborative editing
    if (!cmInstanceRef.current && editorRef.current) {
      cmInstanceRef.current = CodeMirror(editorRef.current, {
        value: '',
        mode: 'python',
        theme: theme,
        lineNumbers: true,
        indentUnit: 4,
        indentWithTabs: false,
        extraKeys: {
          "Ctrl-Space": "autocomplete"
        }
      });

      // Set up collaborative editing with Y.js and y-webrtc
      ydocRef.current = new Y.Doc();
      providerRef.current = new WebrtcProvider(roomName, ydocRef.current);
      const ytext = ydocRef.current.getText('codemirror');
      const awareness = providerRef.current.awareness;

      bindingRef.current = new CodemirrorBinding(ytext, cmInstanceRef.current, awareness, {
        yUndoManager: new Y.UndoManager(ytext)
      });

      awareness.setLocalStateField("user", {
        name: userId,
        color: colorRef.current,
      });

      // Function to initialize content
      const initializeContent = () => {
        if (ytext.length === 0 && questionDeclaration && !initializedRef.current) {
          ytext.insert(0, questionDeclaration);
          initializedRef.current = true;
          questionIdRef.current = questionId;
          providerRef.current.awareness.setLocalStateField('initialized', true);
        }
      };

      // mode change
      setTheme(darkMode ? 'material-darker' : 'eclipse');

      // Initialize content if this is player 1
      if (isPlayer1) {
        initializeContent();
      }

      // Listen for initialization from other clients
      providerRef.current.awareness.on('change', () => {
        const states = providerRef.current.awareness.getStates();
        for (const [clientID, state] of states.entries()) {
          if (state.initialized && !initializedRef.current) {
            initializeContent();
            break;
          }
        }
      });

      // Set up observer to update parent component
      const observer = () => {
        onChange(cmInstanceRef.current.getValue());
      };
      cmInstanceRef.current.on('change', observer);

      return () => {
        if (bindingRef.current) bindingRef.current.destroy();
        if (providerRef.current) providerRef.current.destroy();
        if (ydocRef.current) ydocRef.current.destroy();
        if (cmInstanceRef.current) {
          cmInstanceRef.current.off('change', observer);
          if (cmInstanceRef.current.getWrapperElement()) {
            cmInstanceRef.current.getWrapperElement().remove();
          }
        }
        cmInstanceRef.current = null;
      };
    }
  }, [roomName, isPlayer1, questionDeclaration, onChange, questionId, darkMode, theme]);

  // update the editor content when questionDeclaration changes
  useEffect(() => {
    if (cmInstanceRef.current && questionId !== questionIdRef.current) {
      const ytext = ydocRef.current.getText('codemirror');

      if (isPlayer1) {
        ytext.delete(0, ytext.length);
        ytext.insert(0, questionDeclaration);
        questionIdRef.current = questionId;
      }

      initializedRef.current = false;
    }
  }, [questionId, questionDeclaration, isPlayer1]);

  return (
    <div className="CooperativeEditor">
      <div ref={editorRef}></div>
    </div>
  );
});

export default CooperativeEditor;