import React, { useEffect, useRef } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import { CodemirrorBinding } from 'y-codemirror';
import * as Y from 'yjs';
import RandomColor from 'randomcolor';
import CodeMirror from 'codemirror';
import './editor.css'

import 'codemirror/lib/codemirror.css';
// import 'codemirror/theme/monokai.css';
import "codemirror/mode/python/python";

function App(props) {
  const editorRef = useRef(null);
  const cmInstanceRef = useRef(null);

  useEffect(() => {
    if (!cmInstanceRef.current) {
      // Create CodeMirror instance
      cmInstanceRef.current = CodeMirror(editorRef.current, {
        value: "// Start coding here",
        mode: 'python',
        theme: 'default',
        lineNumbers: true
      });

      // Set up Yjs collaboration
      const ydoc = new Y.Doc();
      const provider = new WebrtcProvider(props.roomName, ydoc);
      const ytext = ydoc.getText('codemirror');
      const awareness = provider.awareness;

      const binding = new CodemirrorBinding(ytext, cmInstanceRef.current, awareness, {
        yUndoManager: new Y.UndoManager(ytext)
      });

      const color = RandomColor();
      awareness.setLocalStateField("user", {
        name: "Users Name",
        color: color,
      });

      return () => {
        binding.destroy();
        provider.destroy();
        ydoc.destroy();
        // Remove the CodeMirror instance from the DOM
        if (cmInstanceRef.current && cmInstanceRef.current.getWrapperElement()) {
          cmInstanceRef.current.getWrapperElement().remove();
        }
        cmInstanceRef.current = null;
      };
    }
  }, [props.roomName]);

  return (
    <div className="App">
      <div ref={editorRef}></div>
    </div>
  );
}

export default App;