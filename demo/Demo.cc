#include "Demo.h"

namespace kk {

	PropertyMap * Demo::propertys() {
		return (PropertyMap *)_propertys.get();
	}
	void Demo::setPropertys(PropertyMap * __newValue__) {
		_propertys = __newValue__;
	}

	kk::String Demo::title() {
		return this->_title;
	}

	kk::Number Demo::version() {
		return this->_version;
	}

	kk::Boolean Demo::output() {
		return _output;
	}
	void Demo::setOutput(kk::Boolean __newValue__) {
		_output = __newValue__;
	}

	kk::Function * Demo::ondone() {
		return (kk::Function *)_ondone.get();
	}
	void Demo::setOndone(kk::Function * __newValue__) {
		_ondone = __newValue__;
	}

	kk::String Demo::exec(kk::String name) {
		return this->done(name);
	}

	kk::String Demo::done(kk::String name) {
		kk::Function * fn = this->_ondone.get();
		if(fn!=nullptr) {
			return ((kk::Any (*)(kk::Any))(kk::IMP)fn)(name);
		}
		return "";
	}

	Demo::Demo(kk::String title,kk::Number version) {
		this->_title="demo";
		this->_version=1.0;
		{
			PropertyMap * __V__ = new PropertyMap();
			this->_propertys = __V__;
		}
		this->_title=title;
		this->_version=version;
	}

	IDemo * createDemo(kk::String title,kk::Number version) {
		return new Demo(title,version);
	}

}



