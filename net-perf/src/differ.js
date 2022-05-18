// 더미 데이터 추가
const beforeFtrace = "# tracer: function_graph\n" +
    "#\n" +
    "# CPU  DURATION                  FUNCTION CALLS\n" +
    "# |     |   |                     |   |   |   |\n" +
    "  6)               |  hsr_netdev_notify [hsr]() {\n" +
    "  6)               |    rtnl_is_locked() {\n" +
    "  6)   0.160 us    |      mutex_is_locked();\n" +
    "  6)   0.770 us    |    }\n" +
    "  6)   0.150 us    |    hsr_port_exists [hsr]();\n" +
    "  6)   0.150 us    |    is_hsr_master [hsr]();\n" +
    "  6)   3.500 us    |  }\n" +
    "  6)               |  hsr_netdev_notify [hsr]() {\n" +
    "  6)               |    rtnl_is_locked() {\n" +
    "  6)   0.090 us    |      mutex_is_locked();\n" +
    "  6)   0.240 us    |    }\n" +
    "  6)   0.080 us    |    hsr_port_exists [hsr]();\n" +
    "  6)   0.090 us    |    is_hsr_master [hsr]();\n" +
    "  6)   0.810 us    |  }\n" +
    " 13)               |  hsr_netdev_notify [hsr]() {\n" +
    " 13)               |    rtnl_is_locked() {\n" +
    " 13)   0.160 us    |      mutex_is_locked();\n" +
    " 13)   0.660 us    |    }\n" +
    " 13)   0.140 us    |    hsr_port_exists [hsr]();\n" +
    " 13)   0.130 us    |    is_hsr_master [hsr]();\n" +
    " 13)   3.110 us    |  }";

const afterFtrace = "# tracer: function_graph\n" +
    "#\n" +
    "# CPU  DURATION                  FUNCTION CALLS\n" +
    "# |     |   |                     |   |   |   |\n" +
    "  6)               |  hsr_netdev_notify [hsr]() {\n" +
    "  6)               |    rtnl_is_locked() {\n" +
    "  6)   0.260 us    |      mutex_is_locked();\n" +
    "  6)   0.370 us    |    }\n" +
    "  6)   0.450 us    |    hsr_port_exists [hsr]();\n" +
    "  6)   0.550 us    |    is_hsr_master [hsr]();\n" +
    "  6)   3.500 us    |  }\n" +
    "  6)               |  hsr_netdev_notify [hsr]() {\n" +
    "  6)               |    rtnl_is_locked() {\n" +
    "  6)   0.090 us    |      mutex_is_locked();\n" +
    "  6)   0.240 us    |    }\n" +
    "  6)   0.080 us    |    hsr_port_exists [hsr]();\n" +
    "  6)   0.090 us    |    is_hsr_master [hsr]();\n" +
    "  6)   0.110 us    |  }\n" +
    " 13)               |  hsr_netdev_notify [hsr]() {\n" +
    " 13)               |    rtnl_is_locked() {\n" +
    " 13)   0.260 us    |      mutex_is_locked();\n" +
    " 13)   0.660 us    |    }\n" +
    " 13)   0.140 us    |    hsr_port_exists [hsr]();\n" +
    " 13)   0.130 us    |    is_hsr_master [hsr]();\n" +
    " 13)   3.110 us    |  }";

// diff Action 정의
const diffAction = {
    ADD: 1,
    DELETE: 2,
    SAME: 3,
}

// diff 를 위해 함수 데이터만 분리
function prepareDiff(text) {
    let results = [];

    for (let i = 4; i < text.length; i++) {
        results.push(text[i].split('|')[1]);
    }

    return results;
}

// lcs 배열 연산
function computeLcs(before, after) {
    let beforeLen = before.length;
    let afterLen = after.length;
    let i, j;

    let lcs = new Array(beforeLen + 1).fill(0);
    for (i = 0; i < beforeLen + 1; i++) {
        lcs[i] = new Array(afterLen + 1).fill(0);
    }

    for (i = 0; i < beforeLen + 1; i++) {
        for (j = 0; j < afterLen + 1; j++) {
            if (i === 0 || j === 0) {
                lcs[i][j] = 0;
            } else if (before[i - 1] === after[j - 1]) {
                lcs[i][j] = 1 + lcs[i - 1][j - 1];
            } else {
                lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
            }
        }
    }

    return lcs;
}

// 함수 실행 시간 파싱
function parseTime(timeString) {
    let time = timeString.replace(/(\s*)/g, "").split('|')[0].split(')')[1].replace("us", "");
    return parseFloat(time);
}

// diff 연산 수행 후 { action : [ADD/DELETE/SAME], time : <걸린 시간>, diff: <실행 시간 차이>, data: <함수>} 형식의 배열으로 리턴
function diff(before, after, beforeFtrace, afterFtrace) {
    let lcs = computeLcs(before, after);
    let results = [];

    let i = before.length;
    let j = after.length;
    let time;

    while (i !== 0 || j !== 0) {
        if (i === 0) {
            time = parseTime(afterFtrace[j + 3]);
            results.push({action: diffAction.ADD, time: time, diff: time, data: after[j - 1]});
            j -= 1;
        } else if (j === 0) {
            time = parseTime(beforeFtrace[i + 3]);
            results.push({action: diffAction.DELETE, time: time, diff: time, data: before[i - 1]});
            i -= 1;
        } else if (before[i - 1] === after[j - 1]) {
            results.push({
                action: diffAction.SAME,
                time: parseTime(afterFtrace[j + 3]),
                diff: parseTime(afterFtrace[j + 3]) - parseTime(beforeFtrace[i + 3]),
                data: before[i - 1]
            });
            i -= 1;
            j -= 1;
        } else if (lcs[i - 1][j] <= lcs[i][j - 1]) {
            time = parseTime(afterFtrace[j + 3]);
            results.push({action: diffAction.ADD, time: time, diff: time, data: after[j - 1]});
            j -= 1;
        } else {
            time = parseTime(beforeFtrace[i + 3]);
            results.push({action: diffAction.DELETE, time: time, diff: time, data: before[i - 1]});
            i -= 1;
        }
    }

    return results.reverse();
}

// 디버깅을 위한 diff 연산 출력 함수 추가
function print_diff(results) {
    for (let i = 4; i < results.length; i++) {
        if (results[i - 4].action === diffAction.SAME) {
            if (isNaN(results[i].time)) console.log("\t\t" + results[i].data);
            else console.log(results[i].diff.toFixed(3) + "us\t" + results[i].data);
        } else if (results[i - 4].action === diffAction.ADD) {
            console.log("\t" + results[i - 4].data);
        }
    }
}

// 기존 text 파일 데이터를 개행을 기준으로 자름
const before = beforeFtrace.split('\n');
const after = afterFtrace.split('\n');
// diff 함수 호출
let diffRes = diff(prepareDiff(before), prepareDiff(after), before, after);
print_diff(diffRes, before, after);