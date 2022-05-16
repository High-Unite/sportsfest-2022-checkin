import QrScanner from "qr-scanner";
import "./styles/styles.css";
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

const qrScanner = new QrScanner(
  videoElem,
  ({ data }) => {
    if (searching) return;
    const d = JSON.parse(data);
    qrScanner.stop();
    searching = true;
    fetchPeople("POST", d)
      .then((res) => {
        document.getElementById("result-modal").classList.add("is-active");
        document.getElementById("result").innerHTML = res.ok
          ? "Processed registration for " + data
          : "An error occurred: " + JSON.stringify(res.message);
        if (res.error) console.error(res);
      })
      .catch((err) => {
        document.getElementById("result-modal").classList.add("is-active");
        document.getElementById("result").innerHTML = JSON.stringify(err);
        console.error(err);
      })
      .finally(() => (searching = false));
  },
  {
    highlightScanRegion: true,
    highlightCodeOutline: true,
  }
);
document.getElementById("startScan").onclick = () => {
  qrScanner.start();
};

Array.from(
  document.querySelectorAll(".modal-close, .modal-background")
).forEach(
  ($el) =>
    ($el.onclick = (e) => {
      e.target.parentElement.classList.remove("is-active");
      qrScanner.start();
    })
);

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
      personName.value = "";
    } else {
      const data = {
        day: +document.querySelector("input.dayInput").value,
        name: personName.value,
      };
      console.log(data);
      fetchPeople("POST", data)
        .then((res: { ok: boolean }) => {
          document.getElementById("result-modal").classList.add("is-active");
          document.getElementById("result").innerHTML = res.ok
            ? `Processed registration of Day ${data.day} for ${data.name}`
            : "An error occurred: " + JSON.stringify(res.message);
          if (res.error) console.error(res);
        })
        .catch((err) => {
          document.getElementById("result-modal").classList.add("is-active");
          document.getElementById("result").innerHTML = JSON.stringify(err);
          console.error(err);
        })
        .finally(() => (personName.value = ""));
    }
  });

  personName.append($dataList);
});