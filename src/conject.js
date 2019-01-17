"use strict";

import Evaluation from "./evaluation";
import {Chainable, C, conditionFrom} from "./chainable";
import condition from "./condition";
import assign from "./assign";

assign(C, {
  Evaluation,
  Chainable,
  condition: (condition, conditionFrom)
});

export default C;
