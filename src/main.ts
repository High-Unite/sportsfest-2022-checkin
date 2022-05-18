import QrScanner from "qr-scanner";
import "./styles/styles.css";
import { setDefaults, toast } from "bulma-toast";

setDefaults({
  duration: 2000,
  position: "top-right",
  dismissible: true,
  animate: { in: "fadeIn", out: "fadeOut" },
});
const videoElem = document.querySelector("video");
let searching = false;

async function fetchPeople(method: "GET" | "POST" | string, data?: any) {
  const help = await fetch(
    "https://script.google.com/macros/s/AKfycbxppEEiPtbudKOGaPM_uxbpAclW45qcyfXTPB8vAxW1yWGZ9wjF5XT1sgNZMZVFA0CIXA/exec",
    {
      method,
      headers: { "Content-Type": "text/plain" },
      body: data ? JSON.stringify(data) : undefined,
    }
  );
  return await help.json();
}

let flashAnimation;

function startSearch() {
  // searching = true;
  // videoElem.pause();
  // document
  //   .querySelector(".scan-region-highlight-svg")
  //   .getAnimations()[0]
  //   .pause();
  if (!flashAnimation) {
flashAnimation    = document.querySelector(".scan-container .scan-flash").animate([{
    opacity: 0
  }, {
    opacity: 1
  }, {
    opacity: 0
  }], {
    duration: 200,
    iterations: 1,
  fill: "backwards"
  });

  } else {
    flashAnimation.play();
  }
}

function stopSearch() {
  videoElem.play();
  document
    .querySelector(".scan-region-highlight-svg")
    .getAnimations()[0]
    .play();
  document
    .querySelector(".scan-region-highlight-svg")
    .classList.remove("found");
  // searching = false;
}

let scans = {};
let submits = {};

function fetchPretty(data: any) {
  return fetchPeople("POST", data)
    .then((res: { ok: boolean }) => {
      if (res.error) {
        switch (res.code) {
          case 1:
            toast({
              message: res.message,
              duration: 4000,
              type: "is-warning",
            });
            break;
          default:
            toast({
              message: "An error occurred: " + JSON.stringify(res.message),
              type: "is-danger",
            });
        }
        return;
      }
      toast({
        message: res.message,
        type: res.ok ? "is-success" : "is-danger",
      });
    })
    .catch((err) => {
      toast({
        message: JSON.stringify(err),
        type: "is-danger",
      });
      console.error(err);
    });
}

const qrScanner = new QrScanner(
  videoElem,
  ({ data }) => {
    const c = scans[data];
    scans[data] = setTimeout(() => delete scans[data], 3000);
    if (c) return clearTimeout(c);
    const n = parseInt(data, 32);
    const hash = n >> 2,
      day = n & 3;
    if (typeof n !== "number") return;
    // qrScanner.stop();
    startSearch();
    fetchPretty({ hash, day })//.finally(stopSearch);
  },
  {
    highlightScanRegion: true,
    highlightCodeOutline: true,
    maxScansPerSecond: 5,
  }
);
document.getElementById("startScan").onclick = () => {
  qrScanner.start();
};
document.getElementById("stopScan").onclick = () => {
  qrScanner.stop();
};

let fetchingPeople = [];

function updateQueue() {
  const $loadingPeople = document.getElementById("loadingPeople")
  let newIndices = [];
  for (let i = 0; i < fetchingPeople.length; i++) {
    const name = fetchingPeople[i]
    if (!$loadingPeople.querySelector(`li[key="${name}"]`)) {
      const newEl = document.createElement("li");
      newEl.setAttribute("class", "notification")
      newEl.setAttribute("key", name);
      newEl.innerHTML = "Loading: " + name;
      console.log(newEl);
      if (i === 0) $loadingPeople.appendChild(newEl);
      else $loadingPeople.querySelector(`li:nth-child(${i})`).after(newEl);
      newEl.animate([{opacity: 0}, {opacity: 1}], {fill: "forwards", duration: 500});
    }
  }
  for (let $li of document.getElementById("loadingPeople").querySelectorAll("li")) {
    if (!fetchingPeople.includes($li.getAttribute("key"))) {
      const a = $li.animate([{opacity: 1}, {opacity: 0}], {duration: 500})
      a.addEventListener('finish', () => {
        $li.parentElement.removeChild($li)
      })
    }
  }
}

// auto-complete thing
fetchPeople("GET").then((people) => {
  const personName = document.querySelector("input#personName");
  const $dataList = document.createElement("datalist");
  $dataList.setAttribute("id", "persons");

  people.forEach((person: string) => {
    const opt = document.createElement("option");
    opt.value = person;
    $dataList.appendChild(opt);
  });

  const formElem = document.querySelector("form#checkPerson");
  formElem.addEventListener("input", (e) => {
    const check = people.indexOf(personName.value) > -1;
    personName.classList[check ? "remove" : "add"]("is-danger");
    personName.setAttribute("invalid", check);
  });
  formElem.addEventListener("submit", (e) => {
    e.preventDefault();
    const check = people.indexOf(personName.value) > -1;
    if (!check) {
      // alert("Invalid or incomplete name");
      // personName.value = "";
    } else {
      const data = {
        day: +document.querySelector("input.dayInput").value,
        name: personName.value,
      };
      const key = data.name;
      const c = submits[key];
      submits[key] = setTimeout(() => delete submits[key], 3000);
      if (c) {
        toast({message: `${data.name} has already been checked in`})
        return clearTimeout(c);
      }
        
      if (!fetchingPeople) {
        personName.parentElement.classList.add("is-loading");
      }
      fetchingPeople.push(key);
      updateQueue();
      personName.value = ""
      // personName.disabled = true;
      // document.getElementById("submit").disabled = true;
      fetchPretty(data).then(
        () => {
          
          // personName.disabled = false
          // document.getElementById("submit").disabled = false
          fetchingPeople.shift();
          updateQueue();
          if (fetchingPeople.length === 0) {
            personName.parentElement.classList.remove("is-loading")
          }
        }
      );
    }
  });

  personName.append($dataList);
});
