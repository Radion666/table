import { useEffect, useRef, useState } from "react";

import { useBlocker } from "react-router-dom";

export const useCustomPrompt = (message, shouldPrompt) => {
  const [proceed, setProceed] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const retry = useRef(() => {});

  useEffect(() => {
    proceed && retry.current();
  }, [proceed]);

  const handleNavigation = (nextLocation) => {
    setShowModal(true);
    retry.current = nextLocation.retry;
  };

  useBlocker(handleNavigation, shouldPrompt);
};
