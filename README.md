### Implementation of Tracing-based Net-perf for Linux Kernel Network Performance Analysis - 한국지식정보기술학회 2022년 제17권 제4호(8월호) 논문 게재

<details open>
<summary>한국어</summary>

# 🌐 net-perf

`net-perf`는 네트워크 성능을 측정하는 웹 도구입니다.
성능 개선이 이루어진 지점을 시각적으로 보여줌으로써 효율적인 분석을 제공합니다.

## 왜 필요할까요?

HSR 토폴로지의 예를 들어보겠습니다. HSR은 리눅스 커널에 구현되어 있지만, 전통적으로 각 노드가 연결된 노드의 MAC 주소를 연결 리스트로 관리합니다. 하나의 노드에 등록된 링크가 많아질수록 성능이 저하됩니다.

최근에는 이러한 문제를 해결하기 위해 리눅스 커널이 각 노드의 MAC 주소 관리 방법을 연결 리스트 구조에서 해시 연결 리스트 구조로 변경하는 패치를 반영하여 성능을 개선했습니다.

그러나 이 성능 개선은 iperf3로 측정된 네트워크 결과로만 확인할 수 있습니다. 즉, 해시 연결 리스트의 사용이 네트워크 성능을 개선했는지 입증할 수 없습니다.

## 무엇을 할까요?

위와 같은 문제를 바탕으로, 성능 개선이 정확히 어느 지점에서 이루어졌는지 증명할 도구의 필요성을 인식하고, ftrace와 iperf3를 사용하여 결과를 시각화하고 표시하는 `net-perf`를 개발하고 있습니다.

## 어떻게 사용하나요?

설치는 간단합니다. 각각의 .json 파일, iperf3 파일, ftrace 파일을 업로드한 후 'test performance'를 클릭하면 됩니다.

```shell
git clone https://github.com/n-perf/net-perf.git
cd net-perf
npm install
npm start
```

.json 파일, iperf3 파일, ftrace 파일을 각각 업로드한 후, 'test performance'를 클릭하십시오.

## 사용 준비

일반적으로 ftrace를 사용하려면 CLI 인터페이스를 통해 접근합니다. 하지만 이 경우 테스트를 수행할 때마다 /sys/kernel/debug/tracing 경로에 추적 명령어를 입력하는 과정이 매우 번거롭다는 단점이 있습니다. 또한 성능을 정확하게 측정하거나 지연 시간에 매우 민감하게 반응하려면 성능 측정 시작 시 추적을 설정하고, 추적 데이터를 수집하고, 즉시 정제하는 것이 훨씬 효율적이라고 생각되었습니다.

prepare 모듈은 성능 측정이 완료되었음을 확인하기 위해 프롬프트에 결과 값을 입력함으로써 성능 측정 시작 시 추적 데이터를 측정합니다. 이 prepare 모듈은 초기화, 함수 등록, 결과 저장 단계로 구성됩니다. 먼저 초기화 단계에서는 기존 ftrace 데이터를 저장할 파일 경로를 설정하고, 기존 추적 결과 데이터를 삭제하며, 각 함수의 호출 깊이와 실행 시간을 확인하기 위해 current_tracer 값을 function_graph로 설정합니다. 다음 그림은 prepare 모듈에서 ftrace 초기화 부분의 코드입니다.

![ftrace초기화](https://user-images.githubusercontent.com/61650992/170805714-30667ed8-f65b-4e2c-8d3f-3e42b1369364.png)

초기화가 완료되면 prepare 모듈은 사용자가 입력한 커널 모듈 이름에 따라 추적할 수 있는 함수 목록을 얻습니다.
커널 빌드 과정에서 모듈의 빌드 옵션이 아래 그림과 같이 [*] (built-in)으로 설정되지 않고, 고가용성 시모레스 이중화처럼 <M> (module)로 설정되어 있는 경우, 추적은 모듈을 참조하여 추적 가능한 함수 목록을 얻을 수 없습니다.
![커널 빌드 옵션](https://user-images.githubusercontent.com/61650992/170805882-063c2e3d-d9eb-4b00-9299-910148445236.png)

따라서 이 경우 먼저 해당 커널 모듈을 로드해야 합니다. 모듈이 로드되었는지 여부는 아래 그림과 같이 lsmod 명령어를 통해 확인할 수 있습니다.

![커널모듈로딩여부](https://user-images.githubusercontent.com/61650992/170806168-aba6d751-68ea-4dda-90cf-867685a1b5af.png)

모듈이 로드되면 ftrace에서 available_filter_functions를 사용하여 추적 가능한 함수 목록을 얻을 수 있습니다. 이 목록을 기반으로 사용자는 성능 측정 과정에서 추적할 함수를 등록합니다. ftrace는 set_graph_function이라는 API를 제공하여 특정 함수를 추적하며, 파일에 함수 이름을 등록하여 필터링할 함수 목록을 구성합니다. 아래는 추적할 함수 등록 단계의 일부 코드로, 커널 모듈 이름에 따라 ftrace에서 추적할 수 있는 함수 목록을 가져오고, 성능 분석을 위해 선택된 함수를 등록합니다. 이후 등록된 함수를 기반으로 추적이 수행됩니다.

![트레이싱할 함수 등록](https://user-images.githubusercontent.com/61650992/170806422-5199566b-8dc0-490f-bc06-3d4fd6bfdd4e.png)

마지막으로 ftrace 결과 저장 단계에서는 사용자가 "When the test is finished (y/n)?" 프롬프트에 y를 입력하면 성능 측정이 완료되고 지금까지의 추적 결과가 초기화 단계에서 지정된 경로에 trace API를 사용하여 저장됩니다.

</details>

<details close>
<summary>English</summary>
# 🌐 net-perf

`net-perf` is a web tool for measuring network performance.
It provide an efficient analysis by providing a visual view of exactly where the performance improvement was made.

## Why?

Let me give you an example of the HSR topology. HSR is implemented in the Linux kernel, but traditionally, the MAC addresses of nodes to which each node is connected are managed in a linked list, and the more links registered in one node, the more performance degrades.

Recently, to solve this problem, the Linux kernel has improved performance by reflecting patches that have changed the MAC address management method of each node from linked list structure to hash linked list.

However, there is a problem that this performance improvement can only be confirmed by the network results measured by iperf3. In other words, it is not possible to prove whether the use of the hash linked list has improved network performance.

## What?

Based on the above issues, we are developing a net-perf that identifies the need for a tool to prove that the performance improvement has been improved by correcting exactly which point, and visualizes and displays the results using ftrace and iperf3.

## How?

Installation is straightforward.

```shell
git clone https://github.com/n-perf/net-perf.git
cd net-perf
npm install
npm start
```

After uploading each of the .json file, iperf3 file, and ftrace file, simply click 'test performance'.

## Prepare Usage

Typically, you access it through the CLI interface to use ftrace. However, in this case, the disadvantage is that the process of entering the tracing command into the /sys/kernel/debug/tracing path every time a test is performed is very cumbersome. In addition, to meet the requirements of measuring performance accurately or to be very sensitive to latency, the user thought it would be much more efficient to set the trace at the start of performance measurement, collect tracing data, and refine it immediately.

The prepare module measures the tracing data during the performance measurement period by executing it at the beginning of the performance measurement by entering the result value at the prompt to confirm that the performance measurement is finished. These prepare modules consist of initialization, function registration, and result storage steps. First, in the initialization step, a file path for storing the existing ftrace data is set, the existing tracing result data is deleted, and the current_tracer value is set to function_graph in order to check the call depth of the function and the execution time of each function. The figure is the code of the ftrace initialization part in the prepare module.

![ftrace초기화](https://user-images.githubusercontent.com/61650992/170805714-30667ed8-f65b-4e2c-8d3f-3e42b1369364.png)

When initialization is completed, the prepare module obtains a list of functions that can be traced according to the kernel module name input by the user.
During the kernel build process, if the module's build option is not configured as [*] (built-in) as shown in Figure below, and is set to <M> (module) as shown in High-availability Seamless Redundancy, the trace cannot refer to the module and obtain a traceable function list.
![커널 빌드 옵션](https://user-images.githubusercontent.com/61650992/170805882-063c2e3d-d9eb-4b00-9299-910148445236.png)

Therefore, in this case, it is necessary to first load the corresponding kernel module. Whether the module is loaded or not can be confirmed through the lsmod command as shown in Figure.

![커널모듈로딩여부](https://user-images.githubusercontent.com/61650992/170806168-aba6d751-68ea-4dda-90cf-867685a1b5af.png)

Once the module is loaded, a traceable list of functions can be obtained using available_filter_functions in ftrace. Based on this list, the user registers a function to be traced in the performance measurement process. ftrace provides an API called set_graph_fuction to trace a specific function, and it constructs a list of functions to filter by registering the function name in the file. Below is a part of the function registration step code to be traced, and a list of functions that can be traced in ftrace according to the kernel module name is taken, and functions that want to be analyzed for performance are selected and registered. After that, tracing is performed based on the registered function.
![트레이싱할 함수 등록](https://user-images.githubusercontent.com/61650992/170806422-5199566b-8dc0-490f-bc06-3d4fd6bfdd4e.png)

Finally, in the ftrace result storage stage, if the user enters y at the "When the test is finished (y/n)?" prompt, the performance measurement is finished and the trace results so far are stored in the path specified in the initialization stage using the trace API.

</details>
