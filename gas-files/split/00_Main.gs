/**
 * Main.gs — エントリポイントとディスパッチャ
 */

/**
 * Code.gs
 * 田んぼ帳 - API 本体
 *
 * フロントから POST されたリクエストを action ごとにディスパッチする。
 */

/**
 * POST エンドポイント。フロントから fetch される入口。
 * リクエスト body は text/plain で JSON 文字列を渡す前提(CORS 回避策)。
 */


function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};

    const result = dispatch(action, payload);
    return jsonResponse({ ok: true, data: result });

  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err.message,
      stack: err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : null
    });
  }
}

/**
 * GET でも疎通確認だけは返す(動作確認時に便利)。
 */

function doGet(e) {
  return jsonResponse({
    ok: true,
    data: { message: 'Tambo-cho GAS is alive.', version: APP_VERSION }
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * action 名で API をディスパッチ。
 */

function dispatch(action, payload) {
  switch (action) {
    case 'ping':              return apiPing();
    case 'initSchema':        return initializeSchema();
    case 'addMember':         return apiAddMember(payload);
    case 'listMembers':       return apiListMembers();
    case 'addVisit':          return apiAddVisit(payload);
    case 'listVisits':        return apiListVisits(payload);
    case 'addFacilityOp':     return apiAddFacilityOp(payload);
    case 'listFacilityOps':   return apiListFacilityOps(payload);
    case 'addNote':           return apiAddNote(payload);
    case 'listNotes':         return apiListNotes();
    case 'uploadPhoto':       return apiUploadPhoto(payload);
    case 'listDutyMaster':    return apiListDutyMaster();
    case 'listSeasonTargets': return apiListSeasonTargets();
    case 'getTodayContext':   return apiGetTodayContext();
    case 'listDutyWeek':      return apiListDutyWeek(payload);
    case 'updateDutyWeek':    return apiUpdateDutyWeek(payload);
    case 'listDutySwaps':     return apiListDutySwaps();
    case 'addDutySwap':       return apiAddDutySwap(payload);
    case 'acceptDutySwap':    return apiAcceptDutySwap(payload);
    case 'updateDutyMaster':  return apiUpdateDutyMaster(payload);
    case 'listPaddyPhenology':   return apiListPaddyPhenology();
    case 'updatePaddyPhenology': return apiUpdatePaddyPhenology(payload);
    case 'listTodos':            return apiListTodos();
    case 'addTodo':              return apiAddTodo(payload);
    case 'updateTodo':           return apiUpdateTodo(payload);
    case 'completeTodo':         return apiCompleteTodo(payload);
    case 'deleteVisit':          return apiDeleteVisit(payload);
    case 'deleteFacilityOp':     return apiDeleteFacilityOp(payload);
    case 'deleteNote':           return apiDeleteNote(payload);
    case 'updateVisit':          return apiUpdateVisit(payload);
    case 'updateFacilityOp':     return apiUpdateFacilityOp(payload);
    case 'updateNote':           return apiUpdateNote(payload);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ─────────────────────────────────────────
// 基本API
// ─────────────────────────────────────────
