import React, { useEffect, useRef, useMemo } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { CodemirrorBinding } from 'y-codemirror';
import * as Y from 'yjs';
import RandomColor from 'randomcolor';
import CodeMirror from 'codemirror';
import './editor.css';

import 'codemirror/lib/codemirror.css';
import "codemirror/mode/python/python";

const CooperativeEditor = React.memo(function CooperativeEditor(props) {
  const editorRef = useRef(null);
  const cmInstanceRef = useRef(null);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const colorRef = useRef(RandomColor());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!cmInstanceRef.current && editorRef.current) {
      cmInstanceRef.current = CodeMirror(editorRef.current, {
        value: '',
        mode: 'python',
        theme: 'default',
        lineNumbers: true
      });

      ydocRef.current = new Y.Doc();
      providerRef.current = new WebrtcProvider(props.roomName, ydocRef.current);
      const ytext = ydocRef.current.getText('codemirror');
      const awareness = providerRef.current.awareness;

      bindingRef.current = new CodemirrorBinding(ytext, cmInstanceRef.current, awareness, {
        yUndoManager: new Y.UndoManager(ytext)
      });

      awareness.setLocalStateField("user", {
        name: "User",
        color: colorRef.current,
      });

      // Function to initialize content
      const initializeContent = () => {
        if (ytext.length === 0 && props.questionDeclaration && !initializedRef.current) {
          ytext.insert(0, props.questionDeclaration);
          initializedRef.current = true;
          providerRef.current.awareness.setLocalStateField('initialized', true);
        }
      };

      // Initialize content if this is player 1
      if (props.isPlayer1) {
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
        props.onChange(cmInstanceRef.current.getValue());
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
  }, [props.roomName, props.isPlayer1, props.questionDeclaration, props.onChange]);

  return (
    <div className="CooperativeEditor">
      <div ref={editorRef}></div>
    </div>
  );
});

export default CooperativeEditor;